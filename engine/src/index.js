
import { validateConfig } from "./config/validateConfig.js";
import { applyEligibilityFilters } from "./filters/applyEligibilityFilters.js";
import { calculateTeamScore } from "./scoring/calculateTeamScore.js";
import { rankTeams } from "./scoring/rankTeams.js";

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
    config.topX
  );

  return {
    rankedTeams,
    shortlist,
    rejectedTeams,
    reviewTeams,
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
