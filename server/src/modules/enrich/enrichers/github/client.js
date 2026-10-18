import { env } from "../../../../config/env.js";

const QUERY = `
query($login: String!, $mergedQuery: String!) {
  user(login: $login) {
    createdAt
    allRepos: repositories(ownerAffiliations: OWNER, privacy: PUBLIC) { totalCount }
    ownRepos: repositories(
      first: 100, isFork: false, ownerAffiliations: OWNER, privacy: PUBLIC,
      orderBy: { field: PUSHED_AT, direction: DESC }
    ) {
      totalCount
      nodes {
        isEmpty
        stargazerCount
        primaryLanguage { name }
        defaultBranchRef { target { ... on Commit { history { totalCount } } } }
      }
    }
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
  mergedPrs: search(query: $mergedQuery, type: ISSUE, first: 1) { issueCount }
}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fatal = (message) => Object.assign(new Error(message), { fatal: true }); // don't retry these

export async function fetchGithubProfile(login, now = Date.now()) {
  const since = new Date(now - 365 * 86_400_000).toISOString().slice(0, 10);
  const body = JSON.stringify({
    query: QUERY,
    variables: {
      login,
      mergedQuery: `author:${login} is:pr is:merged merged:>=${since}`,
    },
  });
  let lastErr;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.githubToken}`,
          "Content-Type": "application/json",
          "User-Agent": "team-shortlist-enrichment",
        },
        body,
      });

      if (res.status === 401) throw fatal("github_bad_token");
      if (res.status === 403 || res.status === 429) {
        throw fatal(
          res.headers.get("x-ratelimit-remaining") === "0"
            ? "github_rate_limited"
            : "github_forbidden",
        );
      }
      if (res.status >= 500) throw new Error(`github_http_${res.status}`); // retryable

      const json = await res.json();
      if (json.errors?.length) {
        const e = json.errors[0];
        if (e.type === "NOT_FOUND") throw fatal("github_user_not_found");
        if (e.type === "RATE_LIMITED") throw fatal("github_rate_limited");
        throw fatal(`github_graphql_error: ${e.message}`);
      }
      return { ...json.data.user, mergedPrs: json.data.mergedPrs.issueCount };
    } catch (err) {
      if (err.fatal) throw err;
      lastErr = err; // network error or 5xx: back off and retry
      await sleep(500 * 2 ** attempt);
    }
  }
  throw new Error(lastErr?.message ?? "github_network_error");
}
