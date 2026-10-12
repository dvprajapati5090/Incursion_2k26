import test from "node:test";
import assert from "node:assert/strict";
import { PRESETS, getPreset, listPresets } from "../src/config/presets.js";

test("lists available strategy presets", () => {
  const presets = listPresets();
  assert.ok(presets.length >= 3);
  assert.ok(presets.some((p) => p.id === "dev_heavy"));
  assert.ok(presets.some((p) => p.id === "balanced"));
});

test("retrieves a preset and customizes topX", () => {
  const preset = getPreset("dev_heavy", 100);
  assert.equal(preset.id, "dev_heavy");
  assert.equal(preset.topX, 100);
  assert.ok(preset.criteria.length > 0);
});

test("throws for an invalid preset id", () => {
  assert.throws(() => getPreset("non_existent_preset"), /Unknown preset/);
});
