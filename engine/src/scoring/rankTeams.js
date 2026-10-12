export function rankTeams(scoredTeams, topX, options = {}) {
  if (!Array.isArray(scoredTeams)) {
    throw new Error("scoredTeams must be an array");
  }

  if (!Number.isInteger(topX) || topX <= 0) {
    throw new Error("topX must be a positive integer");
  }

  const tieBreakers = options.tieBreakers ?? ["teamId"];
  const overrides = options.overrides ?? {};
  const pinnedIds = new Set(overrides.pin ?? []);
  const excludedIds = new Set(overrides.exclude ?? []);
  const waitlistIds = new Set(overrides.waitlist ?? []);

  // Filter valid scored teams
  const validScored = scoredTeams.filter(
    (team) => typeof team.score === "number" && Number.isFinite(team.score)
  );

  // Separate excluded teams
  const excludedTeams = validScored
    .filter((team) => excludedIds.has(team.teamId))
    .map((team) => ({ ...team, overrideStatus: "excluded" }));

  // Separate waitlist teams
  const waitlistTeams = validScored
    .filter((team) => !excludedIds.has(team.teamId) && waitlistIds.has(team.teamId))
    .map((team) => ({ ...team, overrideStatus: "waitlist" }));

  // Candidate pool for ranking (not excluded, not waitlisted)
  const candidates = validScored.filter(
    (team) => !excludedIds.has(team.teamId) && !waitlistIds.has(team.teamId)
  );

  const sortedCandidates = [...candidates].sort((a, b) => {
    // If one is pinned and the other is not, pinned always comes first
    const aPinned = pinnedIds.has(a.teamId);
    const bPinned = pinnedIds.has(b.teamId);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    // Standard score sorting
    if (Math.abs(b.score - a.score) > 0.00001) {
      return b.score - a.score;
    }

    // Break ties according to configured tieBreakers
    for (const rule of tieBreakers) {
      if (rule === "dataCoverage") {
        const covA = a.dataCoverage ?? 0;
        const covB = b.dataCoverage ?? 0;
        if (Math.abs(covB - covA) > 0.0001) {
          return covB - covA;
        }
      } else if (rule === "teamId") {
        return String(a.teamId).localeCompare(String(b.teamId));
      } else {
        // Check metric score in breakdown if tie breaker specifies a metric id
        const metricA = a.breakdown?.find((item) => item.metric === rule)?.score ?? 0;
        const metricB = b.breakdown?.find((item) => item.metric === rule)?.score ?? 0;
        if (Math.abs(metricB - metricA) > 0.0001) {
          return metricB - metricA;
        }
      }
    }

    return String(a.teamId).localeCompare(String(b.teamId));
  });

  const rankedTeams = sortedCandidates.map((team, index) => ({
    ...team,
    rank: index + 1,
    isPinned: pinnedIds.has(team.teamId)
  }));

  return {
    rankedTeams,
    shortlist: rankedTeams.slice(0, topX),
    waitlistTeams,
    excludedTeams
  };
}
