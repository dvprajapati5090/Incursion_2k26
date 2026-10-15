import { promises as fs } from "node:fs";
import path from "node:path";
import { getMetric } from "../src/modules/metrics/registry.js";

const STATUSES = new Set([
  "ok",
  "not_provided",
  "fetch_failed",
  "low_confidence",
]);
const SEVERITIES = new Set(["warn", "info"]);
const SOURCES = ["resume", "github", "linkedin", "portfolio"];

const typeOk = (type, v) =>
  type === "number"
    ? typeof v === "number" && Number.isFinite(v)
    : type === "boolean"
      ? typeof v === "boolean"
      : type === "string"
        ? typeof v === "string"
        : type === "string_list"
          ? Array.isArray(v) && v.every((x) => typeof x === "string")
          : false;

const arg = process.argv[2];
if (!arg) {
  console.error(
    "Usage: npm run validate -- <importId | path/to/enriched.json>",
  );
  process.exit(1);
}
const file = arg.endsWith(".json")
  ? arg
  : path.join("data", "enriched", `${arg}.json`);
const data = JSON.parse(await fs.readFile(file, "utf8"));

const problems = [];
const add = (where, msg) => problems.push(`${where}: ${msg}`);
let members = 0;
let entries = 0;

if (!Array.isArray(data.teams)) add("root", "teams must be an array");

const teamIds = new Set();
for (const t of data.teams ?? []) {
  const tw = String(t.teamId);
  if (typeof t.teamId !== "string") add(tw, "teamId must be a string");
  if (teamIds.has(t.teamId)) add(tw, "duplicate teamId");
  teamIds.add(t.teamId);
  if (!Array.isArray(t.members) || t.members.length === 0)
    add(tw, "needs at least one member");

  for (const m of t.members ?? []) {
    members++;
    const where = m.memberId ?? `${tw}/(no memberId)`;
    if (!m.memberId) add(where, "memberId missing");

    for (const s of SOURCES) {
      if (!(s in (m.sources ?? {})))
        add(where, `sources.${s} missing (must be null when not provided)`);
    }

    for (const [id, e] of Object.entries(m.metrics ?? {})) {
      entries++;
      const def = getMetric(id);
      if (!def) {
        add(where, `unknown metric id ${id}`);
        continue;
      }
      if (def.source === "computed")
        add(where, `${id} is engine-computed and must not be provided`);
      if (!STATUSES.has(e.status))
        add(where, `${id}: bad status "${e.status}"`);
      if (!("value" in e)) add(where, `${id}: value missing`);

      if (e.status === "ok" || e.status === "low_confidence") {
        if (!typeOk(def.type, e.value))
          add(
            where,
            `${id}: value ${JSON.stringify(e.value)?.slice(0, 40)} is not ${def.type}`,
          );
      } else if (e.value !== null) {
        add(where, `${id}: status ${e.status} must have value null`);
      }
      if (
        e.confidence !== undefined &&
        !(e.confidence >= 0 && e.confidence <= 1)
      )
        add(where, `${id}: confidence must be 0 to 1`);
      if (e.status === "fetch_failed" && !e.error)
        add(where, `${id}: fetch_failed needs an error`);
    }

    for (const f of m.flags ?? []) {
      if (!f.code || !f.detail) add(where, "flag needs code and detail");
      if (f.severity && !SEVERITIES.has(f.severity))
        add(where, `flag ${f.code}: bad severity "${f.severity}"`);
    }
  }
}

if (problems.length) {
  console.error(
    `FAILED: ${problems.length} problem(s)\n` +
      problems.map((p) => `  - ${p}`).join("\n"),
  );
  process.exit(1);
}
console.log(
  `OK: ${teamIds.size} teams, ${members} members, ${entries} metric entries valid`,
);
