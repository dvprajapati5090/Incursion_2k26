import { env } from "../../../../config/env.js";
import { cacheGet, cacheSet } from "../../../cache/sqliteCache.js";
import { githubLogin } from "./parseUrl.js";
import { fetchGithubProfile } from "./client.js";
import { summarizeUser, toMetrics, METRIC_IDS } from "./metrics.js";

const TTL_MS = env.githubCacheTtlHours * 3_600_000;
const inflight = new Map(); // same user requested by several members -> one API call

async function getStats(login) {
  const key = `github:user:v1:${login.toLowerCase()}`;

  const cached = cacheGet(key, TTL_MS);
  if (cached) return cached;
  if (inflight.has(key)) return inflight.get(key);

  const promise = (async () => {
    const user = await fetchGithubProfile(login);
    const stats = summarizeUser(user, Date.now());
    cacheSet(key, stats); // failures are never cached
    return stats;
  })().finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}

export default {
  name: "github",
  source: "github",
  metricIds: METRIC_IDS,

  async enrich(member) {
    const login = githubLogin(member.sources.github?.url ?? "");
    if (!login) throw new Error("invalid_github_url");
    return toMetrics(await getStats(login));
  },
};
