
import { validateConfig } from "./config/validateConfig.js";
import { applyEligibilityFilters } from "./filters/applyEligibilityFilters.js";
import { calculateTeamScore } from "./scoring/calculateTeamScore.js";
import { rankTeams } from "./scoring/rankTeams.js";
import { generateExplanation } from "./explain/generateExplanation.js";
import { compareTeams } from "./comparison/compareTeams.js";
import { analyzeSensitivity } from "./sensitivity/analyzeSensitivity.js";
import { PRESETS, getPreset, listPresets } from "./config/presets.js";
import { exportShortlist } from "./export/exportShortlist.js";
import { anonymizeTeams } from "./utils/anonymizeTeams.js";

export function runEngine(teams, config, registry) {
  validateConfig(config, registry);

  if (!Array.isArray(teams)) {
    throw new Error("teams must be an array");
  }

  const {
    eligibleTeams,
    rejectedTeams,
    reviewTeams
  } = applyEligibilityFilters(teams, config.filters ?? []);

  const scoredTeams = eligibleTeams.map((team) =>
    calculateTeamScore(team, config.criteria)
  );

  const {
    rankedTeams,
    shortlist,
    waitlistTeams = [],
    excludedTeams = []
  } = rankTeams(
    scoredTeams,
    config.topX,
    {
      tieBreakers: config.tieBreakers,
      overrides: config.overrides
    }
  );

  // Attach transparent explainability to all teams
  const enrichedRanked = rankedTeams.map((t) => ({
    ...t,
    explanation: generateExplanation(t, config)
  }));

  const enrichedShortlist = shortlist.map((t) => ({
    ...t,
    explanation: generateExplanation(t, config)
  }));

  const enrichedRejected = rejectedTeams.map((t) => ({
    ...t,
    explanation: generateExplanation(t, config)
  }));

  const enrichedReview = reviewTeams.map((t) => ({
    ...t,
    explanation: generateExplanation(t, config)
  }));

  const enrichedWaitlist = waitlistTeams.map((t) => ({
    ...t,
    explanation: generateExplanation(t, config)
  }));

  const enrichedExcluded = excludedTeams.map((t) => ({
    ...t,
    explanation: generateExplanation(t, config)
  }));

  return {
    rankedTeams: enrichedRanked,
    shortlist: enrichedShortlist,
    waitlistTeams: enrichedWaitlist,
    excludedTeams: enrichedExcluded,
    rejectedTeams: enrichedRejected,
    reviewTeams: enrichedReview,
    summary: {
      totalTeams: teams.length,
      eligibleCount: eligibleTeams.length,
      rankedCount: rankedTeams.length,
      shortlistedCount: shortlist.length,
      waitlistCount: waitlistTeams.length,
      excludedCount: excludedTeams.length,
      rejectedCount: rejectedTeams.length,
      reviewCount: reviewTeams.length,
      unscoredCount: eligibleTeams.length - rankedTeams.length - waitlistTeams.length - excludedTeams.length
    }
  };
}

export {
  generateExplanation,
  compareTeams,
  analyzeSensitivity,
  PRESETS,
  getPreset,
  listPresets,
  exportShortlist,
  anonymizeTeams
};


