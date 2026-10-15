import { calculateTeamScore } from "../scoring/calculateTeamScore.js";
import { rankTeams } from "../scoring/rankTeams.js";

/**
 * Runs sensitivity analysis by perturbing criteria weights by a given jitter ratio
 * to evaluate how robust/stable the shortlist is under subjective weight adjustments.
 */
export function analyzeSensitivity(teams, config, options = {}) {
  if (!Array.isArray(teams)) {
    throw new Error("teams must be an array");
  }

  const iterations = options.iterations ?? 15;
  const jitterPercent = options.jitterPercent ?? 0.1; // 10% jitter

  // Baseline run
  const baselineScored = teams.map((t) => calculateTeamScore(t, config.criteria));
  const { shortlist: baselineShortlist, rankedTeams: baselineRanked } = rankTeams(
    baselineScored,
    config.topX
  );

  const baselineShortlistIds = new Set(baselineShortlist.map((t) => t.teamId));
  const teamStats = new Map();

  for (const team of baselineRanked) {
    teamStats.set(team.teamId, {
      teamId: team.teamId,
      teamName: team.teamName ?? team.teamId,
      baselineRank: team.rank,
      baselineScore: team.score,
      ranks: [],
      shortlistedCount: 0
    });
  }

  // Deterministic pseudo-random sequence for reproducible testing
  let seed = 42;
  function pseudoRandom() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }

  // Perturb weights across iterations
  for (let i = 0; i < iterations; i++) {
    const perturbedCriteria = config.criteria.map((c) => {
      // Perturb weight by [-jitterPercent, +jitterPercent]
      const delta = (pseudoRandom() * 2 - 1) * jitterPercent;
      const perturbedWeight = Math.max(0.01, c.weight * (1 + delta));
      return {
        ...c,
        weight: perturbedWeight
      };
    });

    const perturbedScored = teams.map((t) =>
      calculateTeamScore(t, perturbedCriteria)
    );
    const { shortlist, rankedTeams } = rankTeams(
      perturbedScored,
      config.topX
    );

    const iterationShortlistIds = new Set(shortlist.map((t) => t.teamId));

    for (const ranked of rankedTeams) {
      const stat = teamStats.get(ranked.teamId);
      if (stat) {
        stat.ranks.push(ranked.rank);
        if (iterationShortlistIds.has(ranked.teamId)) {
          stat.shortlistedCount++;
        }
      }
    }
  }

  const stabilityReport = Array.from(teamStats.values()).map((stat) => {
    const retentionRate = stat.shortlistedCount / iterations;
    const minRank = Math.min(...stat.ranks);
    const maxRank = Math.max(...stat.ranks);
    const avgRank = Number(
      (stat.ranks.reduce((s, r) => s + r, 0) / stat.ranks.length).toFixed(1)
    );

    let stabilityCategory = "VOLATILE";
    if (retentionRate >= 0.85) {
      stabilityCategory = "STABLE";
    } else if (retentionRate >= 0.6) {
      stabilityCategory = "MODERATE";
    }

    return {
      teamId: stat.teamId,
      teamName: stat.teamName,
      baselineRank: stat.baselineRank,
      inBaselineShortlist: baselineShortlistIds.has(stat.teamId),
      retentionRate: Number(retentionRate.toFixed(2)),
      avgRank,
      rankRange: [minRank, maxRank],
      stability: stabilityCategory
    };
  });

  const baselineShortlistStats = stabilityReport.filter((s) => s.inBaselineShortlist);
  const avgRetention =
    baselineShortlistStats.length === 0
      ? 1
      : baselineShortlistStats.reduce((sum, s) => sum + s.retentionRate, 0) /
        baselineShortlistStats.length;

  const stableCount = baselineShortlistStats.filter((s) => s.stability === "STABLE").length;
  const volatileCount = baselineShortlistStats.filter((s) => s.stability === "VOLATILE").length;

  return {
    iterations,
    jitterPercent,
    shortlistStabilityScore: Number((avgRetention * 100).toFixed(1)),
    stableTeamsCount: stableCount,
    volatileTeamsCount: volatileCount,
    summary: `Shortlist is ${(avgRetention * 100).toFixed(1)}% stable under ±${Math.round(
      jitterPercent * 100
    )}% weight variation (${stableCount} stable, ${volatileCount} volatile teams).`,
    teams: stabilityReport
  };
}
