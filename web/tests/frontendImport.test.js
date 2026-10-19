import { describe, expect, it } from "vitest";
import { enrichTeamsClient, parseClientCsv } from "../src/lib/clientImport.js";

describe("browser-side CSV import", () => {
  it("maps common header aliases, groups rows, and retains extra fields", () => {
    const result = parseClientCsv('Team Number,Name,Email,Theme\nT1,Alice,ALICE@example.com,"Climate, health"\nT1,Bob,,Climate');
    expect(result.teams[0].teamId).toBe("T1");
    expect(result.teams[0].members).toHaveLength(2);
    expect(result.teams[0].members[0].email).toBe("alice@example.com");
    expect(result.teams[0].fields.theme).toBe("Climate, health");
  });

  it("reports a missing team ID mapping instead of silently importing zero teams", () => {
    expect(() => parseClientCsv("Name,Email\nAlice,a@example.com")).toThrow(/team_id/);
  });
});

describe("browser-side fallback enrichment", () => {
  it("fills canonical signals deterministically and marks absent sources not provided", () => {
    const teams = [{
      teamId: "T1",
      members: [{
        memberId: "m1",
        sources: {
          github: { username: "octocat" },
          resume: { text: "Resume body" },
          portfolio: { url: "https://broken.example.org" },
        },
      }],
    }];

    const first = enrichTeamsClient(teams);
    const second = enrichTeamsClient(teams);
    const metrics = first.teams[0].members[0].metrics;

    expect(metrics["github.merged_prs_1y"]).toMatchObject({ status: "ok", origin: "client_estimate" });
    expect(metrics["resume.internship_count"]).toMatchObject({ status: "ok", origin: "client_estimate" });
    expect(metrics["linkedin.skills"]).toMatchObject({ value: null, status: "not_provided" });
    expect(metrics["portfolio.is_reachable"]).toMatchObject({ value: false, status: "ok" });
    expect(metrics["portfolio.has_live_demo"]).toMatchObject({ value: false, status: "ok" });
    expect(first.teams[0].members[0].metrics).toEqual(second.teams[0].members[0].metrics);
    expect(teams[0].members[0].metrics).toBeUndefined();
  });
});
