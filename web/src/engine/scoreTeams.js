/**
 * scoreTeams.js — weighted scoring engine.
 *
 * For each enabled criterion:
 *   1. Extract the raw metric value per member.
 *   2. Compute keyword_match if metric === "resume.keyword_match" (deterministic).
 *   3. Aggregate member values → team raw value.
 *   4. Apply size normalization (per_member divides by team size).
 *   5. Normalize across all teams (minmax / percentile / cap).
 *   6. Handle missing data per onMissing policy.
 *   7. Compute effective weights (redistribute if onMissing = "reweight").
 *   8. Multiply normalized value × effective weight → contribution.
 *   9. Sum contributions → team score.
 *
 * Returns teams with .score, .breakdown, and .dataCoverage attached.
 */
import { normalize } from "./normalize.js";
import { aggregate } from "./aggregate.js";

// ---------- Keyword match (deterministic, no LLM) ----------

function keywordMatch(member, params = {}) {
  const {
    keywords = [],
    matchMode = "any_case_insensitive",
    fields = ["skills", "text"],
    keywordWeights = {},
  } = params;

  if (keywords.length === 0) return null;

  const hasAnyField = fields.some((field) => {
    const m = member.metrics?.[`resume.${field}`];
    return m && (m.status === "ok" || m.status === "low_confidence") && m.value != null;
  });
  if (!hasAnyField) return null;

  const getText = (field) => {
    const m = member.metrics?.[`resume.${field}`];
    if (!m || (m.status !== "ok" && m.status !== "low_confidence")) return "";
    if (Array.isArray(m.value)) return m.value.join(" ");
    return String(m.value ?? "");
  };

  const haystack =
    matchMode === "any_case_insensitive"
      ? fields.map(getText).join(" ").toLowerCase()
      : fields.map(getText).join(" ");

  let totalWeight = 0;
  let matchedWeight = 0;

  for (const kw of keywords) {
    const w = keywordWeights[kw] ?? 1;
    totalWeight += w;
    const needle =
      matchMode === "any_case_insensitive" ? kw.toLowerCase() : kw;
    if (haystack.includes(needle)) matchedWeight += w;
  }

  return totalWeight === 0 ? null : matchedWeight / totalWeight;
}

// ---------- Get raw metric value for a member ----------

function getMemberRaw(member, criterion) {
  if (criterion.metric === "resume.keyword_match") {
    const v = keywordMatch(member, criterion.params ?? {});
    return { value: v, status: v == null ? "not_provided" : "ok" };
  }

  const m = member.metrics?.[criterion.metric];
  if (!m) return { value: null, status: "not_provided" };

  // Treat low_confidence as ok if caller hasn't opted out (engine is lenient by default)
  const effectiveStatus =
    m.status === "ok" || m.status === "low_confidence" ? "ok" : m.status;
  return { value: effectiveStatus === "ok" ? m.value : null, status: m.status };
}

// ---------- Team-level metric extraction ----------

function getTeamRaw(team, criterion) {
  const memberRaws = (team.members ?? []).map((m) =>
    getMemberRaw(m, criterion)
  );
  const values = memberRaws.map((r) => r.value);
  const anyOk = memberRaws.some(
    (r) => r.status === "ok" || r.status === "low_confidence"
  );
  const aggregated = aggregate(values, criterion.aggregation);

  // Size normalization (per_member)
  let finalRaw = aggregated;
  if (criterion.sizeNormalization === "per_member" && finalRaw != null) {
    const teamSize = (team.members ?? []).length;
    if (teamSize > 0) finalRaw = finalRaw / teamSize;
  }

  return { raw: finalRaw, hasData: anyOk };
}

// ---------- Main scorer ----------

/**
 * @param {object[]} teams  - teams with filterResults from applyFilters
 * @param {object}   config
 * @returns {object[]} teams with .score, .breakdown[], .dataCoverage
 */
export function scoreTeams(teams, config) {
  const enabledCriteria = (config.criteria ?? []).filter((c) => c.enabled);
  if (enabledCriteria.length === 0) {
    return teams.map((t) => ({
      ...t,
      score: 0,
      breakdown: [],
      dataCoverage: 0,
    }));
  }

  // ---- Pass 1: collect raw team-level values for normalization ----
  const teamRaws = teams.map((team) =>
    enabledCriteria.map((c) => getTeamRaw(team, c))
  );

  // ---- Pass 2: normalize per criterion across all teams ----
  const normalizedByTeam = enabledCriteria.map((criterion, ci) => {
    const rawValues = teamRaws.map((tr) => tr[ci].raw);
    return normalize(rawValues, criterion.normalization);
  });

  // ---- Pass 3: weight + contribution per team ----
  return teams.map((team, ti) => {
    const criteriaCount = enabledCriteria.length;
    const rawWeights = enabledCriteria.map((c) => c.weight);
    const totalRawWeight = rawWeights.reduce((s, w) => s + w, 0) || 1;

    // First pass: determine which criteria have data
    const slots = enabledCriteria.map((c, ci) => {
      const normalized = normalizedByTeam[ci][ti];
      const hasData = teamRaws[ti][ci].hasData;
      return {
        criterion: c,
        raw: teamRaws[ti][ci].raw,
        normalized,
        hasData,
      };
    });

    // Effective weight calculation (handle onMissing = "reweight")
    const reweightPool = slots
      .filter((s) => !s.hasData && s.criterion.onMissing === "reweight")
      .reduce((sum, s) => sum + s.criterion.weight, 0);

    const activeSlots = slots.filter(
      (s) => s.hasData || s.criterion.onMissing !== "reweight"
    );
    const activeRawWeight = activeSlots.reduce(
      (sum, s) => sum + s.criterion.weight,
      0
    ) || 1;

    // Build breakdown
    let teamScore = 0;
    let criteriaWithData = 0;

    const breakdown = slots.map((s) => {
      const { criterion, raw, normalized, hasData } = s;

      let effectiveWeight;
      let contribution;
      let status;
      let handling;

      if (!hasData) {
        if (criterion.onMissing === "reweight") {
          effectiveWeight = 0;
          contribution = 0;
          status = "missing";
          handling = "reweight";
        } else if (criterion.onMissing === "zero") {
          effectiveWeight = criterion.weight / activeRawWeight;
          contribution = 0;
          status = "missing";
          handling = "zero";
        } else {
          // neutral
          const neutralNorm = criterion.neutralValue ?? 0.5;
          effectiveWeight = criterion.weight / activeRawWeight;
          contribution = neutralNorm * effectiveWeight;
          teamScore += contribution;
          criteriaWithData++;
          status = "missing";
          handling = "neutral";
        }
      } else {
        criteriaWithData++;
        const activeW = criterion.onMissing === "reweight"
          ? criterion.weight / activeRawWeight
          : criterion.weight / activeRawWeight;
        // redistribute reweight pool proportionally
        const reweightBonus = reweightPool > 0
          ? (criterion.weight / (activeRawWeight - reweightPool + 1e-9)) *
            (reweightPool / (totalRawWeight || 1))
          : 0;
        effectiveWeight = activeW + reweightBonus;
        contribution = (normalized ?? 0) * effectiveWeight;
        teamScore += contribution;
        status = "ok";
      }

      return {
        criterionId: criterion.id,
        label: criterion.label,
        metric: criterion.metric,
        raw: raw ?? null,
        normalized: normalized ?? null,
        effectiveWeight: Math.round(effectiveWeight * 10000) / 10000,
        contribution: Math.round(contribution * 10000) / 10000,
        status,
        ...(handling ? { handling } : {}),
      };
    });

    const dataCoverage =
      criteriaCount > 0 ? criteriaWithData / criteriaCount : 0;
    const flaggedIncomplete =
      dataCoverage < (config.missingData?.minCoverageToFlag ?? 0.5);

    const existingFlags = team.flags ?? [];
    const flags = flaggedIncomplete && !existingFlags.includes("incomplete_data")
      ? [...existingFlags, "incomplete_data"]
      : existingFlags;

    // Collect member-level suspicious flags
    const memberFlags = (team.members ?? []).flatMap(
      (m) => m.flags?.map((f) => ({ memberId: m.memberId, ...f })) ?? []
    );

    return {
      ...team,
      score: Math.round(teamScore * 10000) / 10000,
      breakdown,
      dataCoverage: Math.round(dataCoverage * 100) / 100,
      flags,
      memberFlags,
    };
  });
}
