import { describe, expect, it } from "vitest";
import { aggregate } from "../src/engine/aggregate.js";
import { applyFilters } from "../src/engine/applyFilters.js";
import { normalize } from "../src/engine/normalize.js";
import { runShortlist } from "../src/engine/runShortlist.js";
import { scoreTeams } from "../src/engine/scoreTeams.js";

const criterion = (overrides = {}) => ({
  id: "projects", label: "Projects", enabled: true, metric: "resume.project_count",
  weight: 1, normalization: { type: "minmax" }, aggregation: "mean",
  sizeNormalization: "none", onMissing: "reweight", params: {}, ...overrides
});
const metric = (value, status = "ok") => ({ value, status });
const team = (teamId, values) => ({
  teamId, teamName: teamId,
  members: values.map((value, index) => ({ memberId: `${teamId}-${index}`, metrics: { "resume.project_count": value === null ? undefined : metric(value) } }))
});
const config = (overrides = {}) => ({
  schemaVersion: 1, name: "test", selection: { topX: 1, waitlistSize: 1 },
  criteria: [criterion()], filters: [], missingData: { minCoverageToFlag: 0.5 },
  tieBreakers: [{ by: "seeded_random" }], overrides: {}, options: { seed: 42 }, ...overrides
});

describe("active frontend engine normalization and aggregation", () => {
  it("normalizes minmax, percentile, cap, and none with null and boundary inputs", () => {
    expect(normalize([0, 5, 10, null], { type: "minmax" })).toEqual([0, 0.5, 1, null]);
    expect(normalize([10, 10, 10], { type: "minmax" })).toEqual([0.5, 0.5, 0.5]);
    expect(normalize([1, 2, 3], { type: "percentile" })).toEqual([0, 0.5, 1]);
    expect(normalize([7], { type: "percentile" })).toEqual([0.5]);
    expect(normalize([0, 5, 10, null], { type: "cap", cap: 5 })).toEqual([0, 1, 1, null]);
    expect(normalize([2, null], { type: "none" })).toEqual([2, null]);
    expect(normalize([1], { type: "cap", cap: 0 })).toEqual([null]);
  });

  it("computes all five aggregation methods on manual fixtures", () => {
    expect(aggregate([1, 3, 9], "max")).toBe(9);
    expect(aggregate([1, 3, 9], "mean")).toBeCloseTo(13 / 3);
    expect(aggregate([1, 3, 9, 11], "median")).toBe(6);
    expect(aggregate([1, 3, 9], "sum")).toBe(13);
    expect(aggregate([1, 3, 9], "top2_mean")).toBe(6);
    expect(aggregate([null], "median")).toBeNull();
  });

  it("scores ranked teams, returns cutoff and waitlist, and produces reasons", () => {
    const teams = [team("A", [10]), team("B", [5]), team("C", [0])];
    const result = runShortlist(teams, config(), { metrics: [{ id: "resume.project_count" }] });
    expect(result.shortlist.map((x) => x.teamId)).toEqual(["A"]);
    expect(result.shortlist[0].score).toBe(1);
    expect(result.waitlist.map((x) => x.teamId)).toEqual(["B"]);
    expect(result.cutoffScore).toBe(1);
    expect(result.rankedResults.find((x) => x.teamId === "A").reasons.map((x) => x.code)).toContain("ABOVE_CUTOFF");
    expect(result.rankedResults.find((x) => x.teamId === "C").status).toBe("rejected");
  });

  it("is reproducible and leaves input teams and configuration untouched", () => {
    const teams = [team("A", [5]), team("B", [5]), team("C", [5]), team("D", [5])];
    const cfg = config({ selection: { topX: 4, waitlistSize: 0 } });
    const inputCopy = structuredClone(teams);
    const configCopy = structuredClone(cfg);
    const first = runShortlist(teams, cfg);
    const second = runShortlist(teams, cfg);
    expect(first.rankedResults.map((x) => x.teamId)).toEqual(second.rankedResults.map((x) => x.teamId));
    expect(teams).toEqual(inputCopy);
    expect(cfg).toEqual(configCopy);
  });

  it("treats missing keyword source text as missing data, not a zero match", () => {
    const cfg = config({ criteria: [criterion({ metric: "resume.keyword_match", normalization: { type: "none" }, params: { keywords: ["React", "docker"], fields: ["skills", "text"] } })] });
    const teams = [
      { teamId: "hit", members: [{ metrics: { "resume.skills": metric(["React", "Docker"]) } }] },
      { teamId: "partial", members: [{ metrics: { "resume.text": metric("react only") } }] },
      { teamId: "none", members: [{ metrics: {} }] }
    ];
    const scores = scoreTeams(teams, cfg);
    expect(scores.map((x) => x.breakdown[0].raw)).toEqual([1, 0.5, null]);
    expect(scores.map((x) => x.teamId)).toEqual(["hit", "partial", "none"]);
  });

  it("applies missing-data filter policies and warning mode", () => {
    const teams = [
      { teamId: "missing", members: [{ metrics: {} }] },
      { teamId: "no", members: [{ metrics: { x: metric(1) } }] }
    ];
    const results = applyFilters(teams, [
      { id: "f", label: "filter", enabled: true, metric: "x", op: ">=", value: 2, scope: { type: "any_member" }, onMissing: "flag", mode: "reject" }
    ]);
    expect(results.map((x) => x.filterResults[0].result)).toEqual(["flag", "fail"]);
    expect(results.map((x) => x.filterRejected)).toEqual([false, true]);
    const warn = applyFilters(teams.slice(1), [{ id: "w", metric: "x", enabled: true, op: ">", value: 2, scope: { type: "any_member" }, mode: "warn" }]);
    expect(warn[0].filterResults[0].result).toBe("warn");
    expect(warn[0].filterRejected).toBe(false);
  });

  it("applies overrides without duplicating excluded teams in ranked results", () => {
    const teams = [team("A", [10]), team("B", [8]), team("C", [4]), team("D", [0])];
    const cfg = config({ selection: { topX: 2, waitlistSize: 1 }, overrides: { pin: ["D"], exclude: ["A"], waitlist: ["C"] } });
    const result = runShortlist(teams, cfg);
    expect(result.shortlist.map((x) => x.teamId)).toEqual(["D", "B"]);
    expect(result.waitlist.map((x) => x.teamId)).toEqual(["C"]);
    expect(result.rankedResults.map((x) => x.teamId)).toContain("A");
    expect(result.rankedResults.find((x) => x.teamId === "A").status).toBe("excluded");
    expect(result.rankedResults.filter((x) => x.teamId === "A")).toHaveLength(1);
  });
});
