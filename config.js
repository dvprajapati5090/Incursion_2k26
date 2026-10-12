import { z } from "zod";

/**
 * SHARED CONFIG CONTRACT (v1)
 * Frontend reads/writes this. Engine consumes it. Export includes it.
 * Rule: the engine never hardcodes criteria. Everything below is data.
 * `metric` ids come from a metric registry in the engine (e.g. "github.contributions_1y").
 * The frontend can fetch the registry list to populate dropdowns.
 */

// ---------- Building blocks ----------

export const Missing = z.enum([
  "reweight", // ignore this criterion for the team, redistribute its weight
  "zero", // score 0 (still reported as "missing", never silent)
  "neutral", // use a fixed value (see neutralValue)
]);

export const Normalization = z.discriminatedUnion("type", [
  z.object({ type: z.literal("none") }),
  z.object({ type: z.literal("minmax") }), // across all teams
  z.object({ type: z.literal("percentile") }), // rank-based across all teams
  z.object({ type: z.literal("cap"), cap: z.number() }), // value/cap, clipped to 1
]);

export const Aggregation = z.enum([
  "max",
  "mean",
  "median",
  "sum",
  "top2_mean",
]);

export const SizeNormalization = z.enum([
  "none",
  "per_member", // divide sum-type signals by team size
]);

// ---------- Scoring criteria (weighted scoring) ----------

export const Criterion = z.object({
  id: z.string(), // unique, e.g. "projects"
  label: z.string(), // shown in UI
  enabled: z.boolean().default(true),
  metric: z.string(), // registry id, e.g. "resume.project_count"
  weight: z.number().min(0), // relative; engine normalizes weights to sum 1
  normalization: Normalization,
  aggregation: Aggregation, // member-level -> team-level
  sizeNormalization: SizeNormalization.default("none"),
  onMissing: Missing.default("reweight"),
  neutralValue: z.number().min(0).max(1).optional(), // used if onMissing = "neutral"
});

// ---------- Hard filters / eligibility rules ----------

export const Filter = z.object({
  id: z.string(),
  label: z.string(),
  enabled: z.boolean().default(true),
  metric: z.string(), // registry id or raw form field e.g. "field.email"
  op: z.enum([">=", ">", "<=", "<", "==", "!=", "exists", "contains"]),
  value: z.union([z.number(), z.string(), z.boolean()]).optional(),
  // Who must satisfy it?
  scope: z.discriminatedUnion("type", [
    z.object({ type: z.literal("any_member") }),
    z.object({ type: z.literal("all_members") }),
    z.object({
      type: z.literal("at_least_n_members"),
      n: z.number().int().min(1),
    }),
    z.object({ type: z.literal("team") }), // team-level field/metric
  ]),
  // What if the data needed is missing?
  onMissing: z.enum(["fail", "pass", "flag"]).default("flag"),
  // "flag" = team is kept but marked "needs review" (organizer decides)
  mode: z.enum(["reject", "warn"]).default("reject"), // warn = soft rule, never rejects
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
  z.object({ by: z.literal("seeded_random") }), // deterministic, uses options.seed
]);

export const Overrides = z.object({
  pin: z.array(z.string()).default([]), // team ids forced into shortlist
  exclude: z.array(z.string()).default([]), // team ids forced out
  waitlist: z.array(z.string()).default([]), // team ids moved to waitlist
});

export const Config = z.object({
  schemaVersion: z.literal(1),
  name: z.string(), // preset name
  description: z.string().optional(),

  selection: z.object({
    topX: z.number().int().min(1),
    waitlistSize: z.number().int().min(0).default(0),
  }),

  criteria: z.array(Criterion),
  filters: z.array(Filter).default([]),

  missingData: z
    .object({
      // Teams with coverage below this are flagged "incomplete data" in results
      minCoverageToFlag: z.number().min(0).max(1).default(0.5),
    })
    .default({}),

  tieBreakers: z.array(TieBreaker).default([{ by: "seeded_random" }]),
  overrides: Overrides.default({}),

  options: z
    .object({
      seed: z.number().int().default(42), // reproducibility
      blindMode: z.boolean().default(false), // hide names/emails in review UI
    })
    .default({}),
});

exports.module = Config;
