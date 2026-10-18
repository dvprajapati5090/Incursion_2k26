import { promises as fs } from "node:fs";
import path from "node:path";
import { httpError } from "../../utils/httpError.js";

const DIR = path.resolve("data", "enriched");

export async function saveEnriched(
  importId,
  { enrichers, summary, teams, asOf },
) {
  await fs.mkdir(DIR, { recursive: true });
  const record = {
    importId,
    enrichedAt: new Date().toISOString(),
    asOf,
    enrichers,
    summary,
    teams,
  };
  await fs.writeFile(
    path.join(DIR, `${importId}.json`),
    JSON.stringify(record, null, 2),
  );
  return record;
}

export async function loadEnriched(importId) {
  if (!/^imp_[a-f0-9]{8}$/.test(importId))
    throw httpError(400, "BAD_IMPORT_ID", "Invalid import id");
  try {
    return JSON.parse(
      await fs.readFile(path.join(DIR, `${importId}.json`), "utf8"),
    );
  } catch (e) {
    if (e.code === "ENOENT")
      throw httpError(
        404,
        "NOT_ENRICHED_YET",
        `Import ${importId} has not been enriched yet`,
      );
    throw e;
  }
}
