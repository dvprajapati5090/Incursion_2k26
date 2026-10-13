import { describe, expect, it } from "vitest";
import { runShortlist } from "../src/engine/runShortlist.js";

function syntheticTeams(count) {
  return Array.from({ length: count }, (_, index) => {
    const size = 1 + ((index * 17) % 5);
    const members = Array.from({ length: size }, (_, memberIndex) => {
      const metrics = {};
      for (let criterionIndex = 0; criterionIndex < 6; criterionIndex++) {
        const absent = (index + memberIndex + criterionIndex) % 13 === 0;
        if (!absent) {
          metrics[`metric.${criterionIndex}`] = {
            value: (index * 31 + memberIndex * 11 + criterionIndex * 7) % 101,
            status: (index + memberIndex) % 19 === 0 ? "low_confidence" : "ok",
          };
        }
      }
      return {
        memberId: `T${index}-${memberIndex}`,
        email: index % 41 === 0 ? "shared@example.test" : `m${index}-${memberIndex}@example.test`,
        sources: { github: index % 23 === 0 ? { url: "invalid-url" } : null },
        metrics,
        flags: index % 29 === 0 ? [{ code: "SUSPICIOUS_PROFILE" }] : [],
      };
    });
    return {
      teamId: `T${String(index).padStart(4, "0")}`,
      members,
      flags: index % 41 === 0 ? ["duplicate_submission_review"] : [],
    };
  });
}

const config = (topX) => ({
  selection: { topX, waitlistSize: 15 },
  criteria: Array.from({ length: 6 }, (_, index) => ({
    id: `criterion-${index}`, label: `Criterion ${index}`, enabled: true,
    metric: `metric.${index}`, weight: index + 1, normalization: { type: "minmax" },
    aggregation: "median", sizeNormalization: index % 2 ? "per_member" : "none",
    onMissing: index % 3 === 0 ? "neutral" : "reweight", neutralValue: 0.4, params: {},
  })),
  filters: [], missingData: { minCoverageToFlag: 0.5 },
  tieBreakers: [{ by: "data_coverage", direction: "desc" }, { by: "seeded_random" }],
  overrides: {}, options: { seed: 2026 },
});

describe("deterministic synthetic dataset scalability", () => {
  it("ranks 300 variable-size teams with missing and low-confidence metrics", () => {
    const teams = syntheticTeams(300);
    const cfg = config(50);
    const started = performance.now();
    const result = runShortlist(teams, cfg);
    const elapsedMs = performance.now() - started;
    console.info(`300-team scoring duration: ${elapsedMs.toFixed(2)} ms`);
    expect(result.rankedResults).toHaveLength(300);
    expect(result.shortlist).toHaveLength(50);
    expect(result.waitlist).toHaveLength(15);
    expect(new Set(result.rankedResults.map(({ teamId }) => teamId)).size).toBe(300);
    expect(result.rankedResults.every(({ score }) => Number.isFinite(score))).toBe(true);
  });

  it("produces identical rankings for 1,000 teams with varied members, data, flags and ties", () => {
    const teams = syntheticTeams(1000);
    const cfg = config(60);
    const inputCopy = structuredClone(teams);
    const started = performance.now();
    const first = runShortlist(teams, cfg);
    const elapsedMs = performance.now() - started;
    const second = runShortlist(teams, cfg);
    console.info(`1,000-team scoring duration: ${elapsedMs.toFixed(2)} ms`);
    expect(first.rankedResults.map(({ teamId, score, status }) => [teamId, score, status])).toEqual(
      second.rankedResults.map(({ teamId, score, status }) => [teamId, score, status]),
    );
    expect(first.rankedResults).toHaveLength(1000);
    expect(first.shortlist).toHaveLength(60);
    expect(first.waitlist).toHaveLength(15);
    expect(new Set(first.rankedResults.map(({ teamId }) => teamId)).size).toBe(1000);
    expect(first.rankedResults.every(({ score, dataCoverage }) => Number.isFinite(score) && Number.isFinite(dataCoverage))).toBe(true);
    expect(teams).toEqual(inputCopy);
  });
});
