import test from "node:test";
import assert from "node:assert/strict";
import { scoreCriterion } from "../src/scoring/scoreCriterion.js";

const criterion = {
  metric: "github.contributions_1y",
  aggregation: "mean",
  normalization: {
    method: "linear",
    min: 0,
    max: 100
  }
};

test("scores and aggregates available member metrics", () => {
  const team = {
    members: [
      { metrics: { "github.contributions_1y": { value: 40, status: "ok" } } },
      { metrics: { "github.contributions_1y": { value: 80, status: "ok" } } }
    ]
  };

  const result = scoreCriterion(team, criterion);

  assert.equal(result.score, 60);
  assert.equal(result.availableMembers, 2);
  assert.equal(result.totalMembers, 2);
  assert.equal(result.coverage, 1);
});

test("ignores unavailable member metrics and reports coverage", () => {
  const team = {
    members: [
      { metrics: { "github.contributions_1y": { value: 40, status: "ok" } } },
      { metrics: { "github.contributions_1y": { value: null, status: "fetch_failed" } } }
    ]
  };

  const result = scoreCriterion(team, criterion);

  assert.equal(result.score, 40);
  assert.equal(result.availableMembers, 1);
  assert.equal(result.totalMembers, 2);
  assert.equal(result.coverage, 0.5);
});

test("returns a null score when no member has usable data", () => {
  const team = {
    members: [
      { metrics: { "github.contributions_1y": { value: null, status: "not_provided" } } }
    ]
  };

  const result = scoreCriterion(team, criterion);

  assert.equal(result.score, null);
  assert.equal(result.availableMembers, 0);
  assert.equal(result.coverage, 0);
});

test("handles a team with no members", () => {
  const result = scoreCriterion({ members: [] }, criterion);

  assert.equal(result.score, null);
  assert.equal(result.totalMembers, 0);
  assert.equal(result.coverage, 0);
});