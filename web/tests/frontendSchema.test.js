import { describe, expect, it } from "vitest";
import { Config, DEFAULT_CONFIG } from "../src/lib/configSchema.js";

describe("frontend Zod configuration schema", () => {
  it("accepts the shipped default and supplies documented defaults", () => {
    const parsed = Config.parse(DEFAULT_CONFIG);
    expect(parsed.selection.waitlistSize).toBe(10);
    expect(parsed.options.seed).toBe(42);
  });

  it.each([
    ["negative waitlist", (c) => { c.selection.waitlistSize = -1; }],
    ["unknown schema version", (c) => { c.schemaVersion = 2; }],
    ["negative criterion weight", (c) => { c.criteria[0].weight = -1; }],
    ["unknown normalization", (c) => { c.criteria[0].normalization = { type: "linear" }; }],
    ["unknown aggregation", (c) => { c.criteria[0].aggregation = "mean_max"; }],
    ["unknown filter operator", (c) => { c.filters[0].op = "gte"; }],
    ["invalid filter scope", (c) => { c.filters[0].scope = { type: "at_least_n_members", n: 0 }; }],
    ["invalid tie breaker", (c) => { c.tieBreakers = [{ by: "random" }]; }],
    ["neutral outside range", (c) => { c.criteria[0].neutralValue = 1.1; }]
  ])("rejects %s", (_name, mutate) => {
    const invalid = structuredClone(DEFAULT_CONFIG);
    mutate(invalid);
    expect(Config.safeParse(invalid).success).toBe(false);
  });

  it("accepts all currently declared normalization and aggregation options", () => {
    for (const normalization of [{ type: "none" }, { type: "minmax" }, { type: "percentile" }, { type: "cap", cap: 3 }]) {
      for (const aggregation of ["max", "mean", "median", "sum", "top2_mean"]) {
        const candidate = structuredClone(DEFAULT_CONFIG);
        candidate.criteria[0].normalization = normalization;
        candidate.criteria[0].aggregation = aggregation;
        expect(Config.safeParse(candidate).success).toBe(true);
      }
    }
  });
});
