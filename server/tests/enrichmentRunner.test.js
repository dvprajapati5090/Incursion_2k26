import { describe, expect, it } from "vitest";
import { enrichTeams } from "../src/modules/enrich/runner.js";

const member = (source) => ({
  memberId: "m1", sources: { github: source }, metrics: {}, flags: [],
});

describe("enrichment runner status propagation", () => {
  it("marks omitted sources not_provided and catches enricher failures as fetch_failed metadata", async () => {
    const teams = [{ teamId: "T1", members: [member(null), member({ url: "https://github.com/fail" })] }];
    const enricher = {
      name: "test-github", source: "github", metricIds: ["github.contributions_1y"],
      async enrich() { throw new Error("rate limit"); },
    };
    const result = await enrichTeams(teams, [enricher]);
    expect(teams[0].members[0].metrics["github.contributions_1y"]).toMatchObject({ value: null, status: "not_provided" });
    expect(teams[0].members[1].metrics["github.contributions_1y"]).toMatchObject({ value: null, status: "fetch_failed", origin: "test-github", error: "rate limit" });
    expect(result.summary).toMatchObject({ teams: 1, members: 2, llm: { attempted: 0, failed: 0, metricsUpdated: 0 } });
  });

  it("marks a missing enricher metric fetch_failed instead of silently omitting it", async () => {
    const teams = [{ teamId: "T1", members: [member({ url: "https://github.com/ok" })] }];
    const enricher = { name: "partial", source: "github", metricIds: ["github.contributions_1y"], async enrich() { return {}; } };
    await enrichTeams(teams, [enricher]);
    expect(teams[0].members[0].metrics["github.contributions_1y"]).toMatchObject({ status: "fetch_failed", error: "enricher_returned_no_value" });
  });
});
