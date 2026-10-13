import { describe, expect, it } from "vitest";
import { applyFilters } from "../src/engine/applyFilters.js";
import { runShortlist } from "../src/engine/runShortlist.js";
import { rankAndSelect } from "../src/engine/rankAndSelect.js";
import { scoreTeams } from "../src/engine/scoreTeams.js";

const metric = (value, status = "ok") => ({ value, status });
const mkTeam = (teamId, values = [], status = "ok") => ({
  teamId,
  members: values.map((value, index) => ({ memberId: `${teamId}-${index}`, metrics: { score: metric(value, status) } })),
});
const criterion = { id: "c", label: "C", enabled: true, metric: "score", weight: 1, aggregation: "mean", normalization: { type: "minmax" }, sizeNormalization: "none", onMissing: "reweight", params: {} };
const config = (overrides = {}) => ({
  selection: { topX: 5, waitlistSize: 0 }, criteria: [criterion], filters: [],
  missingData: { minCoverageToFlag: 0.5 }, tieBreakers: [{ by: "seeded_random" }], overrides: {}, options: { seed: 17 }, ...overrides,
});

describe("active shortlist engine edge cases", () => {
  it("handles empty and single-team inputs and topX beyond the team count", () => {
    const empty = runShortlist([], config());
    expect(empty).toMatchObject({ rankedResults: [], shortlist: [], waitlist: [], rejected: [], cutoffScore: 0 });
    const one = runShortlist([mkTeam("one", [4])], config());
    expect(one.shortlist.map((entry) => entry.teamId)).toEqual(["one"]);
    expect(one.waitlist).toEqual([]);
  });

  it("returns a finite, flagged score for a team with no members and all criteria missing", () => {
    const result = runShortlist([{ teamId: "empty", members: [] }], config());
    expect(result.rankedResults).toHaveLength(1);
    expect(Number.isFinite(result.rankedResults[0].score)).toBe(true);
    expect(result.rankedResults[0].dataCoverage).toBe(0);
    expect(result.rankedResults[0].flags).toContain("incomplete_data");
    expect(result.rankedResults[0].breakdown[0]).toMatchObject({ status: "missing", handling: "reweight" });
  });

  it("reports score margins and below-cutoff explanations consistently", () => {
    const result = runShortlist([mkTeam("top", [10]), mkTeam("bottom", [0])], config({ selection: { topX: 1, waitlistSize: 0 } }));
    const top = result.rankedResults.find((entry) => entry.teamId === "top");
    const bottom = result.rankedResults.find((entry) => entry.teamId === "bottom");
    expect(top.score).toBe(result.cutoffScore);
    expect(top.margin).toBe(0);
    expect(top.reasons.map(({ code }) => code)).toContain("ABOVE_CUTOFF");
    expect(bottom.margin).toBeLessThan(0);
    expect(bottom.reasons.map(({ code }) => code)).toContain("BELOW_CUTOFF");
  });

  it("keeps every team in the filter-rejected result when no one qualifies", () => {
    const teams = [mkTeam("A", [1]), mkTeam("B", [2])];
    const cfg = config({
      filters: [{ id: "min", label: "minimum", enabled: true, metric: "score", op: ">", value: 10, scope: { type: "any_member" }, onMissing: "fail", mode: "reject" }],
    });
    const result = runShortlist(teams, cfg);
    expect(result.shortlist).toEqual([]);
    expect(result.rankedResults.map(({ status }) => status)).toEqual(["filter_rejected", "filter_rejected"]);
    expect(result.cutoffScore).toBe(0);
  });

  it("evaluates comparison operators and at-least-N member scope at boundaries", () => {
    const team = { teamId: "x", members: [1, 2, 3].map((v) => ({ metrics: { score: metric(v) } })) };
    const cases = [[">=", 2, true], [">", 3, false], ["<=", 1, true], ["<", 2, true], ["==", 2, true], ["!=", 2, true], ["contains", 2, true], ["exists", undefined, true]];
    for (const [op, value, expected] of cases) {
      const [evaluated] = applyFilters([team], [{ id: op, enabled: true, metric: "score", op, value, scope: { type: "any_member" }, onMissing: "fail", mode: "reject" }]);
      expect(evaluated.filterResults[0].result, `${op} ${value}`).toBe(expected ? "pass" : "fail");
    }
    const [atLeast] = applyFilters([team], [{ id: "n", enabled: true, metric: "score", op: ">=", value: 2, scope: { type: "at_least_n_members", n: 2 }, onMissing: "fail", mode: "reject" }]);
    expect(atLeast.filterResults[0].result).toBe("pass");
  });

  it("supports team and all-members scopes and all missing-data policies", () => {
    const complete = { teamId: "complete", members: [1, 2].map((v) => ({ metrics: { score: metric(v) } })) };
    const missing = { teamId: "missing", members: [{ metrics: {} }] };
    const filter = { id: "f", enabled: true, metric: "score", op: ">=", value: 1, scope: { type: "all_members" }, mode: "reject" };
    expect(applyFilters([complete], [filter])[0].filterResults[0].result).toBe("pass");
    expect(applyFilters([complete], [{ ...filter, scope: { type: "team" } }])[0].filterResults[0].result).toBe("pass");
    for (const [onMissing, expected] of [["pass", "pass"], ["flag", "flag"], ["fail", "fail"]]) {
      const [actual] = applyFilters([missing], [{ ...filter, onMissing }]);
      expect(actual.filterResults[0].result).toBe(expected);
      expect(actual.filterRejected).toBe(expected === "fail");
    }
  });

  it("scores missing criteria as reweight, zero, or the configured neutral baseline", () => {
    const missingTeam = { teamId: "missing", members: [{ metrics: {} }] };
    for (const [onMissing, expectedScore, expectedCoverage] of [["reweight", 0, 0], ["zero", 0, 0], ["neutral", 0.4, 1]]) {
      const result = scoreTeams([missingTeam], config({ criteria: [{ ...criterion, onMissing, neutralValue: 0.4 }] }))[0];
      expect(result.score).toBe(expectedScore);
      expect(result.dataCoverage).toBe(expectedCoverage);
      expect(result.breakdown[0]).toMatchObject({ status: "missing", handling: onMissing });
      expect(result.flags.includes("incomplete_data")).toBe(expectedCoverage < 0.5);
    }
  });

  it("normalizes team totals per member when requested", () => {
    const oneTeam = [{ teamId: "pair", members: [2, 4].map((value) => ({ metrics: { score: metric(value) } })) }];
    const total = scoreTeams(oneTeam, config({ criteria: [{ ...criterion, aggregation: "sum", sizeNormalization: "none", normalization: { type: "none" } }] }))[0];
    const perMember = scoreTeams(oneTeam, config({ criteria: [{ ...criterion, aggregation: "sum", sizeNormalization: "per_member", normalization: { type: "none" } }] }))[0];
    expect(total.breakdown[0].raw).toBe(6);
    expect(perMember.breakdown[0].raw).toBe(3);
  });

  it("honors ascending and descending tie-breaker directions", () => {
    const teams = [
      { teamId: "small", score: 1, dataCoverage: 0.5, members: [{}], breakdown: [{ criterionId: "c", contribution: 0.2 }] },
      { teamId: "large", score: 1, dataCoverage: 0.9, members: [{}, {}], breakdown: [{ criterionId: "c", contribution: 0.8 }] },
    ];
    const cfg = config({ selection: { topX: 2, waitlistSize: 0 }, tieBreakers: [{ by: "data_coverage", direction: "asc" }] });
    expect(rankAndSelect(teams, cfg).shortlist.map(({ teamId }) => teamId)).toEqual(["small", "large"]);
    cfg.tieBreakers = [{ by: "team_size", direction: "desc" }];
    expect(rankAndSelect(teams, cfg).shortlist.map(({ teamId }) => teamId)).toEqual(["large", "small"]);
    cfg.tieBreakers = [{ by: "criterion", criterionId: "c", direction: "asc" }];
    expect(rankAndSelect(teams, cfg).shortlist.map(({ teamId }) => teamId)).toEqual(["small", "large"]);
  });
});
