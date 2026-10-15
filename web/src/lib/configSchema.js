/**
 * Config schema (v1) — matches the Zod schema in config.js at repo root.
 * Frontend uses this for validation and as the single source of truth for
 * what a config object looks like. Mirrors configSchema.js (preset example).
 *
 * Using Zod for runtime validation so the same config that is exported and
 * imported always passes through the same guard.
 */
import { z } from "zod";

// ---------- Building blocks ----------

export const Missing = z.enum([
  "reweight", // ignore this criterion, redistribute its weight
  "zero",     // score 0 (reported as "missing", never silent)
  "neutral",  // use a fixed neutralValue
]);

export const Normalization = z.discriminatedUnion("type", [
  z.object({ type: z.literal("none") }),
  z.object({ type: z.literal("minmax") }),
  z.object({ type: z.literal("percentile") }),
  z.object({ type: z.literal("cap"), cap: z.number() }),
]);

export const Aggregation = z.enum([
  "max",
  "mean",
  "median",
  "sum",
  "top2_mean",
]);

export const SizeNormalization = z.enum(["none", "per_member"]);

// ---------- Scoring criteria ----------

export const Criterion = z.object({
  id: z.string(),
  label: z.string(),
  enabled: z.boolean().default(true),
  metric: z.string(),
  weight: z.number().min(0),
  normalization: Normalization,
  aggregation: Aggregation,
  sizeNormalization: SizeNormalization.default("none"),
  onMissing: Missing.default("reweight"),
  neutralValue: z.number().min(0).max(1).optional(),
  params: z.record(z.any()).default({}),
});

// ---------- Hard filters / eligibility rules ----------

export const Filter = z.object({
  id: z.string(),
  label: z.string(),
  enabled: z.boolean().default(true),
  metric: z.string(),
  op: z.enum([">=", ">", "<=", "<", "==", "!=", "exists", "contains"]),
  value: z.union([z.number(), z.string(), z.boolean()]).optional(),
  scope: z.discriminatedUnion("type", [
    z.object({ type: z.literal("any_member") }),
    z.object({ type: z.literal("all_members") }),
    z.object({
      type: z.literal("at_least_n_members"),
      n: z.number().int().min(1),
    }),
    z.object({ type: z.literal("team") }),
  ]),
  onMissing: z.enum(["fail", "pass", "flag"]).default("flag"),
  mode: z.enum(["reject", "warn"]).default("reject"),
});

// ---------- Tie-breaking, overrides, options ----------

export const TieBreaker = z.discriminatedUnion("by", [
  z.object({
    by: z.literal("criterion"),
    criterionId: z.string(),
    direction: z.enum(["asc", "desc"]).default("desc"),
  }),
  z.object({
    by: z.literal("data_coverage"),
    direction: z.enum(["asc", "desc"]).default("desc"),
  }),
  z.object({
    by: z.literal("team_size"),
    direction: z.enum(["asc", "desc"]).default("asc"),
  }),
  z.object({ by: z.literal("seeded_random") }),
]);

export const Overrides = z.object({
  pin: z.array(z.string()).default([]),
  exclude: z.array(z.string()).default([]),
  waitlist: z.array(z.string()).default([]),
});

export const Config = z.object({
  schemaVersion: z.literal(1),
  name: z.string(),
  description: z.string().optional(),

  selection: z.object({
    topX: z.number().int().min(1),
    waitlistSize: z.number().int().min(0).default(0),
  }),

  criteria: z.array(Criterion),
  filters: z.array(Filter).default([]),

  missingData: z
    .object({
      minCoverageToFlag: z.number().min(0).max(1).default(0.5),
    })
    .default({}),

  tieBreakers: z.array(TieBreaker).default([{ by: "seeded_random" }]),
  overrides: Overrides.default({}),

  options: z
    .object({
      seed: z.number().int().default(42),
      blindMode: z.boolean().default(false),
    })
    .default({}),
});

// ---------- Default / starter config ----------

export const DEFAULT_CONFIG = {
  schemaVersion: 1,
  name: "Default preset",
  description: "Balanced scoring across GitHub, resume, and portfolio",
  selection: { topX: 50, waitlistSize: 10 },
  criteria: [
    {
      id: "projects",
      label: "Projects",
      enabled: true,
      metric: "resume.project_count",
      weight: 4,
      normalization: { type: "percentile" },
      aggregation: "top2_mean",
      sizeNormalization: "none",
      onMissing: "reweight",
      params: {},
    },
    {
      id: "achievements",
      label: "Achievements",
      enabled: true,
      metric: "resume.achievement_count",
      weight: 3,
      normalization: { type: "cap", cap: 5 },
      aggregation: "max",
      sizeNormalization: "none",
      onMissing: "reweight",
      params: {},
    },
    {
      id: "github_activity",
      label: "GitHub Activity",
      enabled: true,
      metric: "github.contributions_1y",
      weight: 2,
      normalization: { type: "minmax" },
      aggregation: "sum",
      sizeNormalization: "per_member",
      onMissing: "zero",
      params: {},
    },
    {
      id: "education",
      label: "Education",
      enabled: true,
      metric: "resume.education_level",
      weight: 1,
      normalization: { type: "minmax" },
      aggregation: "mean",
      sizeNormalization: "none",
      onMissing: "neutral",
      neutralValue: 0.5,
      params: {},
    },
  ],
  filters: [
    {
      id: "min_github",
      label: "At least one member with 50+ GitHub contributions (past year)",
      enabled: true,
      metric: "github.contributions_1y",
      op: ">=",
      value: 50,
      scope: { type: "any_member" },
      onMissing: "flag",
      mode: "reject",
    },
  ],
  missingData: { minCoverageToFlag: 0.5 },
  tieBreakers: [
    { by: "criterion", criterionId: "projects", direction: "desc" },
    { by: "data_coverage", direction: "desc" },
    { by: "seeded_random" },
  ],
  overrides: { pin: [], exclude: [], waitlist: [] },
  options: { seed: 42, blindMode: false },
};
