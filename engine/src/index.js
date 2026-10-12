
import { validateConfig } from "./config/validateConfig.js";
import { applyEligibilityFilters } from "./filters/applyEligibilityFilters.js";
import { calculateTeamScore } from "./scoring/calculateTeamScore.js";
import { rankTeams } from "./scoring/rankTeams.js";
import { generateExplanation } from "./explain/generateExplanation.js";
import { compareTeams } from "./comparison/compareTeams.js";
import { analyzeSensitivity } from "./sensitivity/analyzeSensitivity.js";

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

  const { rankedTeams, shortlist } = rankTeams(
    scoredTeams,
    config.topX,
    { tieBreakers: config.tieBreakers }
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

  return {
    rankedTeams: enrichedRanked,
    shortlist: enrichedShortlist,
    rejectedTeams: enrichedRejected,
    reviewTeams: enrichedReview,
    summary: {
      totalTeams: teams.length,
      eligibleCount: eligibleTeams.length,
      rankedCount: rankedTeams.length,
      shortlistedCount: shortlist.length,
      rejectedCount: rejectedTeams.length,
      reviewCount: reviewTeams.length,
      unscoredCount: eligibleTeams.length - rankedTeams.length
    }
  };
}

export {
  generateExplanation,
  compareTeams,
  analyzeSensitivity
};

