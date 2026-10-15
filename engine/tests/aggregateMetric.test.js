import { test } from "vitest";
import assert from "node:assert/strict";
import { aggregateMetric } from "../src/scoring/aggregateMetric.js";

test("calculates the mean", () => {
  assert.equal(aggregateMetric([40, 70, 90], "mean"), 200 / 3);
});

test("calculates the maximum", () => {
  assert.equal(aggregateMetric([40, 70, 90], "max"), 90);
});

test("calculates the mean_max average", () => {
  assert.equal(aggregateMetric([40, 70, 90], "mean_max"), (200 / 3 + 90) / 2);
});

test("ignores missing and invalid values", () => {
  assert.equal(aggregateMetric([40, null, 80], "mean"), 60);
});

test("returns null when all values are missing", () => {
  assert.equal(aggregateMetric([null, undefined], "mean"), null);
});

test("returns null for an empty team", () => {
  assert.equal(aggregateMetric([], "mean"), null);
});

test("rejects unsupported methods", () => {
  assert.throws(
    () => aggregateMetric([40, 70], "sum"),
    /Unsupported aggregation method/
  );
});