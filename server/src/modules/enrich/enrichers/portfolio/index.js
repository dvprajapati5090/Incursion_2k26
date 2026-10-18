import { createHash } from "node:crypto";
import { env } from "../../../../config/env.js";
import { cacheGet, cacheSet } from "../../../cache/sqliteCache.js";
import { ok, fetchFailed } from "../../../metrics/metricValue.js";
import { safeFetchHtml } from "./safeFetch.js";
import { toMetrics, METRIC_IDS } from "./parse.js";

const TTL_MS = env.portfolioCacheTtlHours * 3_600_000;
const inflight = new Map();

// We cache the fetched HTML (not the results), so improving the parsing rules takes effect immediately.
async function getPage(url) {
  const key = `portfolio:v1:html:${createHash("sha256").update(url).digest("hex")}`;

  const cached = cacheGet(key, TTL_MS);
  if (cached) return cached;
  if (inflight.has(key)) return inflight.get(key);

  const promise = (async () => {
    const page = await safeFetchHtml(url);
    cacheSet(key, page); // failures are never cached
    return page;
  })().finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}

export default {
  name: "portfolio",
  source: "portfolio",
  metricIds: METRIC_IDS,

  async enrich(member) {
    const url = member.sources.portfolio?.url;
    if (!url) throw new Error("no_portfolio_url");

    let page;
    try {
      page = await getPage(url);
    } catch (e) {
      if (e.blocked) throw e; // never fetched: every metric becomes fetch_failed with the reason

      // We tried and the site did not open. That is a real measurement, not a missing value.
      const reachable = ok("portfolio.is_reachable", false, {
        origin: "http_check",
      });
      reachable.error = e.message;
      const failed = Object.fromEntries(
        METRIC_IDS.map((id) => [id, fetchFailed("portfolio", e.message)]),
      );
      return {
        ...failed,
        "portfolio.is_reachable": reachable,
        "portfolio.has_live_demo": ok("portfolio.has_live_demo", false, {
          origin: "http_check",
        }),
      };
    }
    return toMetrics(page);
  },
};
