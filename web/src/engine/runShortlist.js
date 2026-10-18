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
function adaptCriteria(criteria = [], teams = []) {
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
      if (norm?.type === "minmax" && Array.isArray(teams) && teams.length > 0) {
        const vals = teams
          .flatMap((t) => t.members ?? [])
          .map((m) => m.metrics?.[metric]?.value)
          .filter((v) => typeof v === "number" && Number.isFinite(v));
        const maxVal = vals.length > 0 ? Math.max(...vals) : 100;
        const minVal = vals.length > 0 ? Math.min(...vals) : 0;
        const safeMax = maxVal > minVal ? maxVal : minVal + 1;
        norm = { method: "linear", min: minVal, max: safeMax };
      } else {
        const cap = typeof norm?.cap === "number" && norm.cap > 0 ? norm.cap : 100;
        norm = { method: "linear", min: 0, max: cap };
      }
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
      const isTeamLevel = field === "team.size" || field.startsWith("field.");
      const rawScope = f.scope?.type || f.scope;
      const scope = isTeamLevel
        ? "team"
        : rawScope === "all_members"
        ? "all_members"
        : "any_member";

      let val = f.value ?? 0;
      if (typeof val === "string" && !isNaN(Number(val)) && val.trim() !== "") {
        val = Number(val);
      } else if (val === "true" || val === true) {
        val = true;
      } else if (val === "false" || val === false) {
        val = false;
      }

      return {
        field,
        operator: op,
        scope,
        value: val,
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
  const adaptedCriteria = adaptCriteria(config.criteria, teams);
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

  // Handle teams with null scores or no members so they are never silently dropped
  const eligibleTeams = engineResult.eligibleTeams ?? teams.filter((t) =>
    !(engineResult.rejectedTeams ?? []).some((r) => r.teamId === t.teamId) &&
    !(engineResult.reviewTeams ?? []).some((r) => r.teamId === t.teamId)
  );

  const scoredTeamsMap = new Map();
  for (const t of (engineResult.rankedTeams ?? [])) {
    scoredTeamsMap.set(t.teamId, t);
  }
  for (const t of (engineResult.waitlistTeams ?? [])) {
    scoredTeamsMap.set(t.teamId, t);
  }
  for (const t of (engineResult.excludedTeams ?? [])) {
    scoredTeamsMap.set(t.teamId, t);
  }

  // Any eligible team that was unscored (e.g. 0 members or 0 evaluated weight)
  const allEligibleScored = [];
  for (const t of eligibleTeams) {
    if (scoredTeamsMap.has(t.teamId)) {
      allEligibleScored.push(scoredTeamsMap.get(t.teamId));
    } else {
      // Create safe zero fallback team
      const fallbackTeam = {
        ...t,
        teamId: t.teamId,
        teamName: t.teamName || t.teamId,
        score: 0,
        dataCoverage: 0,
        flags: [...(t.flags ?? []), "incomplete_data"],
        breakdown: adaptedCriteria.map((c) => ({
          metric: c.metric,
          score: null,
          status: "missing",
          handling: "reweight",
          weight: c.weight,
          coverage: 0,
        })),
      };
      allEligibleScored.push(fallbackTeam);
    }
  }

  // Identify overrides
  const pinnedIds = new Set(engineConfig.overrides.pin ?? []);
  const waitlistIds = new Set(engineConfig.overrides.waitlist ?? []);
  const excludedIds = new Set(engineConfig.overrides.exclude ?? []);

  // Separate excluded & manual waitlist
  const manualExcluded = (engineResult.excludedTeams ?? []).map((t) => ({
    ...t,
    status: "excluded",
  }));

  const manualWaitlist = (engineResult.waitlistTeams ?? []).map((t) => ({
    ...t,
    status: "waitlisted",
  }));

  // Candidates for ranking
  const candidatePool = allEligibleScored.filter(
    (t) => !excludedIds.has(t.teamId) && !waitlistIds.has(t.teamId)
  );

  // Sort candidates (pinned first, then by score descending)
  candidatePool.sort((a, b) => {
    const aPin = pinnedIds.has(a.teamId);
    const bPin = pinnedIds.has(b.teamId);
    if (aPin && !bPin) return -1;
    if (!aPin && bPin) return 1;
    return (b.score ?? 0) - (a.score ?? 0);
  });

  const waitlistSize = Math.max(
    0,
    Number(config.selection?.waitlistSize ?? config.waitlistSize ?? 0)
  );

  // Partition shortlist, auto-waitlist, below-cutoff
  const rawShortlist = candidatePool.slice(0, topX);
  const extraCandidates = candidatePool.slice(topX);
  const autoWaitlist = extraCandidates.slice(0, waitlistSize);
  const belowCutoff = extraCandidates.slice(waitlistSize);

  const lastTeam = rawShortlist.length > 0 ? rawShortlist[rawShortlist.length - 1] : null;
  const rawCutoff = lastTeam?.score != null ? lastTeam.score : 0;
  const cutoffScore = Number((rawCutoff > 1 ? rawCutoff / 100 : rawCutoff).toFixed(4));

  // Decorate team helper
  function decorateTeam(t, status, rank = null) {
    const rawScore = t.score != null ? t.score : 0;
    const scaledScore = rawScore > 1 ? rawScore / 100 : rawScore;
    const score = Number(scaledScore.toFixed(4));
    const margin =
      status === "filter_rejected" || status === "review"
        ? null
        : Number((score - cutoffScore).toFixed(4));

    let reasons = t.reasons;
    if (!reasons || reasons.length === 0) {
      if (pinnedIds.has(t.teamId)) {
        reasons = [{ code: "PINNED_OVERRIDE", description: "Pinned to shortlist by human reviewer" }];
      } else if (status === "shortlisted") {
        reasons = [{ code: "ABOVE_CUTOFF", margin, description: "Qualified above shortlist cutoff threshold" }];
      } else if (status === "waitlisted") {
        reasons = [{ code: "WAITLIST", margin, description: "On standby cushion buffer" }];
      } else if (status === "filter_rejected") {
        reasons = [{ code: "FILTER_REJECTED", description: "Disqualified by eligibility rules" }];
      } else if (status === "excluded") {
        reasons = [{ code: "EXCLUDED_OVERRIDE", description: "Excluded by reviewer" }];
      } else {
        reasons = [{ code: "BELOW_CUTOFF", margin, description: "Scored below shortlist cutoff" }];
      }
    }

    // Ensure breakdown fields
    const breakdown = (t.breakdown ?? []).map((b) => ({
      ...b,
      status: b.score != null ? "ok" : "missing",
      handling: b.score != null ? "score" : "reweight",
    }));

    const isPinned = pinnedIds.has(t.teamId);
    const flags = [...(t.flags ?? [])];
    if (t.dataCoverage === 0 && !flags.includes("incomplete_data")) {
      flags.push("incomplete_data");
    }

    return {
      ...t,
      score,
      status,
      rank,
      margin,
      reasons,
      breakdown,
      flags,
      isPinned,
    };
  }

  // Build Shortlist
  const shortlist = rawShortlist.map((t, idx) => decorateTeam(t, "shortlisted", idx + 1));

  // Build Waitlist (manual overrides + auto waitlist buffer)
  const waitlistMap = new Map();
  for (const t of manualWaitlist) {
    waitlistMap.set(t.teamId, t);
  }
  for (const t of autoWaitlist) {
    if (!waitlistMap.has(t.teamId)) {
      waitlistMap.set(t.teamId, t);
    }
  }
  const waitlist = Array.from(waitlistMap.values()).map((t, idx) =>
    decorateTeam(t, "waitlisted", shortlist.length + idx + 1)
  );

  // Build Rejected (below cutoff + manual excluded + filter rejected)
  const filterRejected = (engineResult.rejectedTeams ?? []).map((t) =>
    decorateTeam(t, "filter_rejected", null)
  );

  const excluded = manualExcluded.map((t) => decorateTeam(t, "excluded", null));

  const rejectedBelow = belowCutoff.map((t, idx) =>
    decorateTeam(t, "rejected", shortlist.length + waitlist.length + idx + 1)
  );

  const rejected = [...filterRejected, ...excluded, ...rejectedBelow];

  // Review Teams
  const review = (engineResult.reviewTeams ?? []).map((t) => decorateTeam(t, "review", null));

  // Full Leaderboard (Shortlist first, then Waitlist, then Review, then Rejected)
  const rankedResults = [];
  const seenIds = new Set();
  for (const t of [...shortlist, ...waitlist, ...review, ...rejected]) {
    if (!seenIds.has(t.teamId)) {
      seenIds.add(t.teamId);
      rankedResults.push(t);
    }
  }

  const runMeta = {
    runAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    totalTeams: teams.length,
    topX,
    waitlistSize,
    cutoffScore,
    ...engineResult.summary,
  };

  return {
    ...engineResult,
    rankedResults,
    shortlist,
    waitlist,
    rejected,
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
