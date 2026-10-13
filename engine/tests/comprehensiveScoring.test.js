import { describe, expect, it } from "vitest";
import { aggregateMetric } from "../src/scoring/aggregateMetric.js";
import { calculateTeamScore } from "../src/scoring/calculateTeamScore.js";
import { runEngine } from "../src/index.js";

const criteria = [
  { metric: "m.a", weight: 3, aggregation: "mean", normalization: { method: "linear", min: 0, max: 10 } },
  { metric: "m.b", weight: 1, aggregation: "max", normalization: { method: "linear", min: 0, max: 10 } }
];
const registry = { metrics: [{ id: "m.a" }, { id: "m.b" }] };
const config = { topX: 2, criteria };
const team = (teamId, a, b) => ({
  teamId,
  teamName: teamId,
  members: [{ metrics: {
    ...(a !== undefined && { "m.a": a }),
    ...(b !== undefined && { "m.b": b })
  } }]
});
const metric = (value, status = "ok") => ({ value, status });

describe("implemented scoring contract", () => {
  it("calculates weighted scores and effective data coverage exactly", () => {
    const result = calculateTeamScore(team("A", metric(8), metric(4)), criteria);
    expect(result.score).toBe(70); // (80 * 3 + 40) / 4
    expect(result.dataCoverage).toBe(1);
    expect(result.breakdown.map(({ score }) => score)).toEqual([80, 40]);
  });

  it("redistributes weight across present metrics and treats non-ok statuses as missing", () => {
    const result = calculateTeamScore(team("A", metric(8), metric(9, "fetch_failed")), criteria);
    expect(result.score).toBe(80);
    expect(result.dataCoverage).toBe(0.75);
    expect(result.breakdown[1].score).toBeNull();
  });

  it("returns null when no weighted criterion has usable data", () => {
    expect(calculateTeamScore(team("A", metric(null), metric(0, "not_provided")), criteria).score).toBeNull();
  });

  it("aggregates exactly the implemented methods and rejects undocumented methods", () => {
    expect(aggregateMetric([1, 3, 9], "mean")).toBe(13 / 3);
    expect(aggregateMetric([1, 3, 9], "max")).toBe(9);
    expect(aggregateMetric([1, 3, 9], "mean_max")).toBeCloseTo(20 / 3, 12);
    expect(aggregateMetric([], "mean")).toBeNull();
    expect(() => aggregateMetric([1], "median")).toThrow(/Unsupported aggregation/);
  });

  it("runs reproducibly without mutating input and explains ranked teams", () => {
    const teams = [team("B", metric(4), metric(8)), team("A", metric(8), metric(4)), team("C", metric(2), metric(2))];
    const before = structuredClone(teams);
    const first = runEngine(teams, config, registry);
    const second = runEngine(teams, config, registry);
    expect(first.rankedTeams).toEqual(second.rankedTeams);
    expect(first.rankedTeams.map(({ teamId }) => teamId)).toEqual(["A", "B", "C"]);
    expect(first.shortlist.map(({ teamId }) => teamId)).toEqual(["A", "B"]);
    expect(first.rankedTeams[0].explanation.score).toBe(first.rankedTeams[0].score);
    expect(teams).toEqual(before);
  });

  it("keeps unknown override IDs inert and reports explicit overrides in their own buckets", () => {
    const teams = [team("A", metric(8), metric(4)), team("B", metric(4), metric(8)), team("C", metric(2), metric(2))];
    const result = runEngine(teams, { ...config, overrides: { pin: ["C", "missing"], exclude: ["A"], waitlist: ["B"] } }, registry);
    expect(result.shortlist.map(({ teamId }) => teamId)).toEqual(["C"]);
    expect(result.excludedTeams.map(({ teamId }) => teamId)).toEqual(["A"]);
    expect(result.waitlistTeams.map(({ teamId }) => teamId)).toEqual(["B"]);
  });

  it("ranks a deterministic 1,000-team dataset without duplicates or invalid scores", () => {
    const teams = Array.from({ length: 1000 }, (_, index) => ({
      teamId: `T${String(index).padStart(4, "0")}`,
      members: [{ metrics: {
        "m.a": metric((index * 37) % 101),
        ...(index % 7 !== 0 && { "m.b": metric((index * 19) % 101) })
      } }]
    }));
    const before = structuredClone(teams);
    const result = runEngine(teams, { ...config, topX: 25 }, registry);
    const ids = result.rankedTeams.map(({ teamId }) => teamId);
    expect(result.summary.rankedCount).toBe(1000);
    expect(result.shortlist).toHaveLength(25);
    expect(new Set(ids).size).toBe(1000);
    expect(result.rankedTeams.every(({ score }) => Number.isFinite(score))).toBe(true);
    expect(result.rankedTeams.every((current, index, all) => index === 0 || all[index - 1].score >= current.score)).toBe(true);
    expect(teams).toEqual(before);
  });
});
