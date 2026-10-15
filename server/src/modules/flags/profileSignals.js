import { THRESHOLDS as T } from "./thresholds.js";

// Only trust metrics that came back "ok"; missing data never produces a flag.
const val = (member, id) =>
  member.metrics[id]?.status === "ok" ? member.metrics[id].value : null;
const pct = (x) => `${Math.round(x * 100)}%`;

export function flagProfileSignals(member) {
  const flags = [];

  const publicRepos = val(member, "github.public_repos");
  const forked = val(member, "github.forked_ratio");
  const originalForForks = val(member, "github.original_repos");
  if (
    publicRepos !== null &&
    forked !== null &&
    originalForForks !== null &&
    publicRepos >= T.highForkMinRepos &&
    forked >= T.highForkRatio &&
    originalForForks <= T.highForkMaxOriginals
  ) {
    flags.push({
      code: "HIGH_FORK_RATIO",
      severity: "warn",
      detail: `${pct(forked)} of ${publicRepos} public repos are forks, only ${originalForForks} original`,
    });
  }

  const original = val(member, "github.original_repos");
  const empty = val(member, "github.empty_repo_ratio");
  if (
    original !== null &&
    empty !== null &&
    original >= T.emptyRepoMinRepos &&
    empty >= T.emptyRepoRatio
  ) {
    flags.push({
      code: "MANY_EMPTY_REPOS",
      severity: "warn",
      detail: `${pct(empty)} of sampled original repos are empty or have under 2 commits`,
    });
  }

  const age = val(member, "github.account_age_days");
  if (age !== null && age < T.newAccountDays) {
    flags.push({
      code: "NEW_ACCOUNT",
      severity: "info",
      detail: `GitHub account is ${age} days old`,
    });
  }

  const contributions = val(member, "github.contributions_1y");
  const months = val(member, "github.active_months_1y");
  if (
    contributions !== null &&
    months !== null &&
    months <= T.burstMaxActiveMonths &&
    contributions >= T.burstMinContributions
  ) {
    flags.push({
      code: "BURST_ACTIVITY",
      severity: "info",
      detail: `${contributions} contributions, all within ${months} month(s)`,
    });
  }

  const skills = val(member, "resume.skills");
  if (Array.isArray(skills) && skills.length > T.longSkillList) {
    flags.push({
      code: "SKILLS_LIST_VERY_LONG",
      severity: "info",
      detail: `${skills.length} skills listed`,
    });
  }

  return flags;
}
