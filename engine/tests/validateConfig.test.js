
import { test } from "vitest";
import assert from "node:assert/strict";
import { validateConfig } from "../src/config/validateConfig.js";

const registry = {
  metrics: [
    { id: "resume.project_count", type: "number" },
    { id: "github.original_repos", type: "number" }
  ]
};

const validConfig = {
  topX: 5,
  criteria: [
    {
      metric: "resume.project_count",
      weight: 40,
      aggregation: "mean",
      normalization: {
        method: "linear",
        min: 0,
        max: 5
      }
    }
  ]
};

test("accepts a valid configuration", () => {
  assert.equal(validateConfig(validConfig, registry), true);
});

test("rejects invalid topX", () => {
  assert.throws(
    () => validateConfig({ ...validConfig, topX: 0 }, registry),
    /topX must be a positive integer/
  );
});

test("rejects unknown metrics", () => {
  const config = structuredClone(validConfig);
  config.criteria[0].metric = "github.magic_score";

  assert.throws(
    () => validateConfig(config, registry),
    /Unknown metric/
  );
});

test("rejects negative weights", () => {
  const config = structuredClone(validConfig);
  config.criteria[0].weight = -10;

  assert.throws(
    () => validateConfig(config, registry),
    /Invalid weight/
  );
});
