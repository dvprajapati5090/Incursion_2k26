import { describe, expect, it } from "vitest";
import { runEngine } from "../src/index.js";

const registry = { metrics: [{ id: "metric.score" }] };
const config = {
  topX: 5,
  criteria: [{ metric: "metric.score", weight: 1, aggregation: "mean", normalization: { method: "linear", min: 0, max: 10 } }],
};
const team = (teamId, values) => ({ teamId, members: values.map((value) => ({ metrics: { "metric.score": { value, status: "ok" } } })) });

describe("legacy engine edge cases", () => {
  it("returns an empty but valid result for an empty dataset", () => {
    const result = runEngine([], config, registry);
    expect(result.rankedTeams).toEqual([]);
    expect(result.shortlist).toEqual([]);
    expect(result.summary).toMatchObject({ totalTeams: 0, eligibleCount: 0, rankedCount: 0, shortlistedCount: 0, waitlistCount: 0 });
  });

  it("shortlists one team when topX is larger than the dataset", () => {
    const result = runEngine([team("solo", [5])], config, registry);
    expect(result.shortlist.map((entry) => entry.teamId)).toEqual(["solo"]);
    expect(result.shortlist[0].rank).toBe(1);
  });

  it("counts an allowed zero-member team as eligible but unscored", () => {
    const result = runEngine([{ teamId: "empty-team", members: [] }], config, registry);
    expect(result.summary).toMatchObject({ totalTeams: 1, eligibleCount: 1, rankedCount: 0, unscoredCount: 1 });
  });

  it("returns every team in the rejected bucket when all teams fail an eligibility rule", () => {
    const result = runEngine([team("A", [2]), team("B", [8])], {
      ...config,
      filters: [{ field: "team.size", operator: "gte", value: 2 }],
    }, registry);
    expect(result.rejectedTeams.map((entry) => entry.teamId)).toEqual(["A", "B"]);
    expect(result.rankedTeams).toEqual([]);
    expect(result.summary.unscoredCount).toBe(0);
  });

  it("never returns a non-finite score for invalid numeric metric payloads", () => {
    const result = runEngine([
      team("valid", [10]),
      { teamId: "invalid", members: [{ metrics: { "metric.score": { value: Number.NaN, status: "ok" } } }] },
    ], config, registry);
    expect(result.rankedTeams.every((entry) => Number.isFinite(entry.score))).toBe(true);
    expect(result.rankedTeams.map((entry) => entry.teamId)).toEqual(["valid"]);
    expect(result.summary.unscoredCount).toBe(1);
  });
});
