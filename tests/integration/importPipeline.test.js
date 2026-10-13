import { describe, expect, it } from "vitest";
import { importCsv } from "../../server/src/modules/import/index.js";
import { runEngine } from "../../engine/src/index.js";
import mockGithub from "../../server/src/modules/enrich/enrichers/mockGithub.js";
import { exportShortlist } from "../../engine/src/export/exportShortlist.js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("server CSV importer contract", () => {
  it("groups members, normalizes empty values and emails, preserves extras, and flags duplicate emails", () => {
    const csv = "team_id,team_name,member_name,member_email,github_url,notes\nT1,Alpha,Alice,SHARED@example.com,github.com/alice,first\nT1,Alpha,Bob,shared@example.com,,second\nT2,Beta,Carol,shared@example.com,not a url,third\n,No ID,Skip,,,";
    const { teams, report } = importCsv(csv);
    expect(teams).toHaveLength(2);
    expect(teams[0].members).toHaveLength(2);
    expect(teams[0].members[0].email).toBe("shared@example.com");
    expect(teams[0].members[1].sources.github).toBeNull();
    expect(teams[0].fields.notes).toBe("first");
    expect(teams.flatMap(({ members }) => members).every((m) => m.flags.some((f) => f.code === "DUPLICATE_EMAIL"))).toBe(true);
    expect(report.rowsSkipped).toBe(1);
    expect(report.issues.map(({ code }) => code)).toContain("MISSING_TEAM_ID");
    expect(report.issues.map(({ code }) => code)).toContain("INVALID_URL");
  });

  it("handles quoted delimiters and rejects a missing team ID mapping", () => {
    const { teams } = importCsv('team_id,team_name,member_name,description\nT1,Alpha,Alice,"Builds, tests, and ships"');
    expect(teams[0].fields.description).toBe("Builds, tests, and ships");
    expect(() => importCsv("name,email\nAlice,a@example.com")).toThrow(/team_id/);
  });

  it("connects normalized CSV member rows to the real scoring engine", () => {
    const { teams } = importCsv("team_id,member_name\nT1,Alice\nT2,Bob");
    for (const [index, t] of teams.entries()) {
      t.members[0].metrics["resume.project_count"] = { value: index ? 2 : 8, status: "ok" };
    }
    const result = runEngine(teams, { topX: 1, criteria: [{ metric: "resume.project_count", weight: 1, aggregation: "mean", normalization: { method: "linear", min: 0, max: 10 } }] }, { metrics: [{ id: "resume.project_count" }] });
    expect(result.shortlist[0].teamId).toBe("T1");
    expect(result.summary.totalTeams).toBe(2);
  });

  it("runs CSV import through mocked enrichment, scoring, ranking, explanation, and config export", async () => {
    const { teams } = importCsv("team_id,team_name,member_name,github_url\nT1,Alpha,Alice,https://github.com/alpha\nT2,Beta,Bob,https://github.com/beta");
    for (const team of teams) {
      Object.assign(team.members[0].metrics, await mockGithub.enrich(team.members[0]));
    }
    const config = { topX: 1, criteria: [{ metric: "github.contributions_1y", weight: 1, aggregation: "mean", normalization: { method: "linear", min: 0, max: 300 } }] };
    const result = runEngine(teams, config, { metrics: [{ id: "github.contributions_1y" }] });
    expect(result.shortlist).toHaveLength(1);
    expect(result.shortlist[0].explanation.summary).toContain("Ranked #1");
    const exported = JSON.parse(exportShortlist(result, config));
    expect(exported.configuration).toEqual(config);
    expect(exported.shortlist[0].teamId).toBe(result.shortlist[0].teamId);
  });

  it("imports the repository's 300-team sample without dropping rows or creating duplicate team records", async () => {
    const csv = await readFile(path.join(repoRoot, "shared-samples", "teams_300_sample.csv"), "utf8");
    const { teams, report } = importCsv(csv);
    expect(teams).toHaveLength(300);
    expect(report.rowsSkipped).toBe(0);
    expect(report.membersFound).toBeGreaterThanOrEqual(300);
    expect(new Set(teams.map(({ teamId }) => teamId)).size).toBe(300);
    expect(report.issues.some(({ code }) => code === "INVALID_URL" || code === "UNEXPECTED_DOMAIN")).toBe(true);
  });

  it("accepts a header-only team CSV as an empty dataset and returns useful mapping errors", () => {
    expect(importCsv("team_id,member_name\n").teams).toEqual([]);
    expect(() => importCsv("")).toThrow(/team_id/);
  });
});
