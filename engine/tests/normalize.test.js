
import { test } from "vitest";
import assert from "node:assert/strict";
import { normalizeNumeric } from "../src/scoring/normalize.js";

test("normalizes a middle value", () => {
  assert.equal(normalizeNumeric(3, 0, 5), 60);
});

test("normalizes the minimum to zero", () => {
  assert.equal(normalizeNumeric(0, 0, 5), 0);
});

test("normalizes the maximum to 100", () => {
  assert.equal(normalizeNumeric(5, 0, 5), 100);
});

test("caps values above the maximum", () => {
  assert.equal(normalizeNumeric(8, 0, 5), 100);
});

test("rejects invalid ranges", () => {
  assert.throws(() => normalizeNumeric(3, 5, 5), /Invalid normalization range/);
});

test("rejects non-numeric values", () => {
  assert.throws(() => normalizeNumeric(null, 0, 5), /finite number/);
});


test("lower values receive higher scores when direction is lower", () => {
  assert.equal(normalizeNumeric(0, 0, 100, "lower"), 100);
  assert.equal(normalizeNumeric(50, 0, 100, "lower"), 50);
  assert.equal(normalizeNumeric(100, 0, 100, "lower"), 0);
});

test("rejects an unsupported direction", () => {
  assert.throws(
    () => normalizeNumeric(50, 0, 100, "sideways"),
    /Direction must be/
  );
});
