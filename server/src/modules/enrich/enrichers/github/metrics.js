import { ok } from "../../../metrics/metricValue.js";

const MIN_COMMITS = 2; // repos with fewer commits than this count as "empty"
const DAY_MS = 86_400_000;
const round2 = (n) => Math.round(n * 100) / 100;

export const METRIC_IDS = [
  "github.contributions_1y",
  "github.public_repos",
  "github.original_repos",
  "github.forked_ratio",
  "github.empty_repo_ratio",
  "github.stars_received",
  "github.active_months_1y",
  "github.account_age_days",
  "github.languages",
  "github.language_count",
  "github.merged_prs_1y",
  "github.last_activity_days",
];

function isEmptyRepo(r) {
  const commits = r.defaultBranchRef?.target?.history?.totalCount ?? 0;
  return r.isEmpty || commits < MIN_COMMITS;
}

// Raw GraphQL user -> compact stats (cached). Repo-level stats come from the
// 100 most recently pushed original repos (sampledOriginalRepos says how many).
export function summarizeUser(user, fetchedAt) {
  const nodes = user.ownRepos.nodes;
  const calendar = user.contributionsCollection.contributionCalendar;

  const days = calendar.weeks.flatMap((w) => w.contributionDays);
  const months = new Set(
    days.filter((d) => d.contributionCount > 0).map((d) => d.date.slice(0, 7)),
  );

  const langCounts = {};
  for (const r of nodes) {
    const l = r.primaryLanguage?.name;
    if (l) langCounts[l] = (langCounts[l] || 0) + 1;
  }
  const languages = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])) // deterministic order
    .map(([name]) => name)
    .slice(0, 10);
  const activeDates = days
    .filter((d) => d.contributionCount > 0)
    .map((d) => d.date);
  const lastActivityDate = activeDates.length
    ? activeDates.reduce((a, b) => (a > b ? a : b))
    : null;
  return {
    createdAt: user.createdAt,
    fetchedAt,
    totalContributions: calendar.totalContributions,
    activeMonths: Math.min(12, months.size),
    publicRepos: user.allRepos.totalCount,
    originalRepos: user.ownRepos.totalCount,
    sampledOriginalRepos: nodes.length,
    emptyRepos: nodes.filter(isEmptyRepo).length,
    starsReceived: nodes.reduce((sum, r) => sum + r.stargazerCount, 0),
    languages,
    mergedPrs1y: user.mergedPrs ?? 0,
    lastActivityDate,
  };
}

export function toMetrics(s) {
  const o = { origin: "github_api" };
  const forks = s.publicRepos - s.originalRepos;
  // Account age is measured at fetch time, so cached results stay identical on reruns
  const ageDays = Math.floor(
    (s.fetchedAt - new Date(s.createdAt).getTime()) / DAY_MS,
  );
  const lastActivityDays = s.lastActivityDate
    ? Math.max(
        0,
        Math.floor(
          (s.fetchedAt - Date.parse(`${s.lastActivityDate}T00:00:00Z`)) /
            DAY_MS,
        ),
      )
    : 366; // no contributions in the past year: the real value is above 365
  const lastActivity = ok("github.last_activity_days", lastActivityDays, o);
  if (!s.lastActivityDate)
    lastActivity.note =
      "no contributions in the past year; the real value is above 365";
  return {
    "github.merged_prs_1y": ok("github.merged_prs_1y", s.mergedPrs1y ?? 0, o),
    "github.last_activity_days": lastActivity,
    "github.contributions_1y": ok(
      "github.contributions_1y",
      s.totalContributions,
      o,
    ),
    "github.public_repos": ok("github.public_repos", s.publicRepos, o),
    "github.original_repos": ok("github.original_repos", s.originalRepos, o),
    "github.forked_ratio": ok(
      "github.forked_ratio",
      s.publicRepos ? round2(forks / s.publicRepos) : 0,
      o,
    ),
    "github.empty_repo_ratio": ok(
      "github.empty_repo_ratio",
      s.sampledOriginalRepos
        ? round2(s.emptyRepos / s.sampledOriginalRepos)
        : 0,
      o,
    ),
    "github.stars_received": ok("github.stars_received", s.starsReceived, o),
    "github.active_months_1y": ok("github.active_months_1y", s.activeMonths, o),
    "github.account_age_days": ok("github.account_age_days", ageDays, o),
    "github.languages": ok("github.languages", s.languages, o),
    "github.language_count": ok("github.language_count", s.languages.length, o),
  };
}
