import { test } from "vitest";
import assert from "node:assert/strict";
import { analyzeSensitivity } from "../src/sensitivity/analyzeSensitivity.js";

const config = {
  topX: 2,
  criteria: [
    {
      metric: "m1",
      weight: 60,
      aggregation: "mean",
      normalization: { method: "linear", min: 0, max: 100 }
    },
    {
      metric: "m2",
      weight: 40,
      aggregation: "mean",
      normalization: { method: "linear", min: 0, max: 100 }
    }
  ]
};

const teams = [
  {
    teamId: "T1",
    members: [{ metrics: { m1: { status: "ok", value: 95 }, m2: { status: "ok", value: 90 } } }]
  },
  {
    teamId: "T2",
    members: [{ metrics: { m1: { status: "ok", value: 70 }, m2: { status: "ok", value: 75 } } }]
  },
  {
    teamId: "T3",
    members: [{ metrics: { m1: { status: "ok", value: 40 }, m2: { status: "ok", value: 30 } } }]
  }
];

test("performs sensitivity analysis and calculates stability scores", () => {
  const result = analyzeSensitivity(teams, config, { iterations: 10, jitterPercent: 0.1 });

  assert.equal(result.iterations, 10);
  assert.equal(result.jitterPercent, 0.1);
  assert.equal(typeof result.shortlistStabilityScore, "number");
  assert.ok(result.shortlistStabilityScore >= 0 && result.shortlistStabilityScore <= 100);
  assert.equal(result.teams.length, 3);

  // T1 is clearly dominant, so it should be STABLE
  const t1Stat = result.teams.find((t) => t.teamId === "T1");
  assert.equal(t1Stat.stability, "STABLE");
  assert.equal(t1Stat.retentionRate, 1);
});
