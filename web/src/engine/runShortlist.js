/**
 * Engine Adapter — Connects the frontend to the original scoring engine (@engine/index.js).
 *
 * Runs the original pure engine:
 *   runEngine(teams, config, registry)
 *
 * Provides bidirectional adaptation between the frontend store models and the original engine schema,
 * ensuring high performance, zero side effects, and live re-ranking in Web Worker.
 */
import {
  runEngine,
  compareTeams,
  analyzeSensitivity,
  exportShortlist,
  anonymizeTeams,
  PRESETS,
  getPreset,
  listPresets,
} from "@engine/index.js";

// Operator mapping from frontend symbols to engine operator codes
const OP_MAP = {
  ">=": "gte",
  "<=": "lte",
  ">": "gt",
  "<": "lt",
  "==": "eq",
  "!=": "neq",
  "exists": "exists",
  "contains": "in",
  "gte": "gte",
  "lte": "lte",
  "gt": "gt",
  "lt": "lt",
  "eq": "eq",
  "neq": "neq",
  "in": "in",
};

// Aggregations supported by engine
const VALID_AGGREGATIONS = new Set(["mean", "max", "mean_max"]);

/**
 * Normalizes user-configured criteria to meet the original engine's validateConfig contract
 */
function adaptCriteria(criteria = []) {
  const enabledCriteria = criteria.filter((c) => c && c.enabled !== false);
  if (enabledCriteria.length === 0) {
    // Fallback default criterion if all were disabled or none provided
    return [
      {
        metric: "github.contributions_1y",
        weight: 1,
        aggregation: "mean",
        direction: "higher",
        normalization: { method: "linear", min: 0, max: 200 },
      },
    ];
  }

  const seenMetrics = new Set();
  const adapted = [];

  for (const c of enabledCriteria) {
    const metric = c.metric || "github.contributions_1y";
    if (seenMetrics.has(metric)) continue; // engine requires unique metrics
    seenMetrics.add(metric);

    let agg = c.aggregation;
    if (!VALID_AGGREGATIONS.has(agg)) {
      if (agg === "sum" || agg === "top2_mean") agg = "mean_max";
      else if (agg === "median") agg = "mean";
      else agg = "mean";
    }

    let norm = c.normalization;
    if (
      !norm ||
      norm.method !== "linear" ||
      typeof norm.min !== "number" ||
      typeof norm.max !== "number" ||
      norm.max <= norm.min
    ) {
      const cap = typeof norm?.cap === "number" && norm.cap > 0 ? norm.cap : 100;
      norm = { method: "linear", min: 0, max: cap };
    }

    adapted.push({
      metric,
      label: c.label || metric,
      weight: typeof c.weight === "number" && c.weight > 0 ? c.weight : 1,
      aggregation: agg,
      direction: c.direction === "lower" ? "lower" : "higher",
      normalization: norm,
    });
  }

  return adapted.length > 0
    ? adapted
    : [
        {
          metric: "github.contributions_1y",
          weight: 1,
          aggregation: "mean",
          direction: "higher",
          normalization: { method: "linear", min: 0, max: 200 },
        },
      ];
}

/**
 * Adapts frontend filters to original engine's applyEligibilityFilters schema
 */
function adaptFilters(filters = []) {
  return filters
    .filter((f) => f && f.enabled !== false)
    .map((f) => {
      const field = f.field || f.metric || "team.size";
      const op = OP_MAP[f.op || f.operator] || "gte";
      const scope = f.scope?.type || f.scope || "any_member";
      return {
        field,
        operator: op,
        scope,
        value: f.value ?? 0,
      };
    });
}

/**
 * Adapts tieBreakers to array format expected by engine
 */
function adaptTieBreakers(tieBreakers = []) {
  if (!Array.isArray(tieBreakers)) return ["teamId"];
  const list = [];
  for (const tb of tieBreakers) {
    if (typeof tb === "string") list.push(tb);
    else if (tb?.by === "data_coverage" || tb?.by === "dataCoverage") list.push("dataCoverage");
    else if (tb?.by === "criterion" && tb.criterionId) list.push(tb.criterionId);
    else if (tb?.by === "team_size") list.push("team.size");
  }
  if (!list.includes("teamId")) list.push("teamId");
  return list;
}

/**
 * Main Shortlisting Function — Executes the original engine
 *
 * @param {object[]} teams    - Raw or enriched teams
 * @param {object}   config   - User selection configuration
 * @param {object}   registry - Metrics registry
 * @returns {object} Standardized results containing ranked teams, shortlist, explanations, etc.
 */
export function runShortlist(teams, config = {}, registry = { metrics: [] }) {
  const startedAt = Date.now();

  const topX = Math.max(1, Number(config.topX || config.selection?.topX || 50));
  const adaptedCriteria = adaptCriteria(config.criteria);
  const adaptedFilters = adaptFilters(config.filters);
  const adaptedTieBreakers = adaptTieBreakers(config.tieBreakers);

  const engineConfig = {
    topX,
    criteria: adaptedCriteria,
    filters: adaptedFilters,
    tieBreakers: adaptedTieBreakers,
    overrides: {
      pin: config.overrides?.pin || [],
      exclude: config.overrides?.exclude || [],
      waitlist: config.overrides?.waitlist || [],
    },
  };

  // Build registry metrics set so validateConfig is guaranteed to find all criteria metrics
  const registryMetrics = Array.isArray(registry?.metrics) ? [...registry.metrics] : [];
  const existingMetricIds = new Set(registryMetrics.map((m) => m.id));
  for (const c of adaptedCriteria) {
    if (!existingMetricIds.has(c.metric)) {
      registryMetrics.push({ id: c.metric, source: "computed", type: "number" });
      existingMetricIds.add(c.metric);
    }
  }
  const engineRegistry = { metrics: registryMetrics };

  // Run the Original Engine
  const engineResult = runEngine(teams, engineConfig, engineRegistry);

  // Decorate teams with status and normalized attributes
  const shortlist = (engineResult.shortlist ?? []).map((t) => ({
    ...t,
    status: "shortlisted",
  }));

  const waitlist = (engineResult.waitlistTeams ?? []).map((t) => ({
    ...t,
    status: "waitlisted",
  }));

  const excluded = (engineResult.excludedTeams ?? []).map((t) => ({
    ...t,
    status: "excluded",
  }));

  const rejected = (engineResult.rejectedTeams ?? []).map((t) => ({
    ...t,
    status: "rejected",
  }));

  const review = (engineResult.reviewTeams ?? []).map((t) => ({
    ...t,
    status: "review",
  }));

  // Combine for full leaderboard
  const seenIds = new Set();
  const rankedResults = [];

  for (const t of shortlist) {
    if (!seenIds.has(t.teamId)) {
      seenIds.add(t.teamId);
      rankedResults.push(t);
    }
  }

  for (const t of (engineResult.rankedTeams ?? [])) {
    if (!seenIds.has(t.teamId)) {
      seenIds.add(t.teamId);
      rankedResults.push({ ...t, status: "waitlisted" });
    }
  }

  for (const t of waitlist) {
    if (!seenIds.has(t.teamId)) {
      seenIds.add(t.teamId);
      rankedResults.push(t);
    }
  }

  for (const t of review) {
    if (!seenIds.has(t.teamId)) {
      seenIds.add(t.teamId);
      rankedResults.push(t);
    }
  }

  for (const t of excluded) {
    if (!seenIds.has(t.teamId)) {
      seenIds.add(t.teamId);
      rankedResults.push(t);
    }
  }

  for (const t of rejected) {
    if (!seenIds.has(t.teamId)) {
      seenIds.add(t.teamId);
      rankedResults.push(t);
    }
  }

  const cutoffScore =
    shortlist.length > 0 && shortlist[shortlist.length - 1].score != null
      ? Number(shortlist[shortlist.length - 1].score.toFixed(4))
      : 0;

  const runMeta = {
    runAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    totalTeams: teams.length,
    topX,
    cutoffScore,
    ...engineResult.summary,
  };

  return {
    ...engineResult,
    rankedResults,
    shortlist,
    waitlist,
    rejected: [...rejected, ...excluded],
    reviewTeams: review,
    cutoffScore,
    runMeta,
  };
}

export {
  runEngine,
  compareTeams,
  analyzeSensitivity,
  exportShortlist,
  anonymizeTeams,
  PRESETS,
  getPreset,
  listPresets,
};
