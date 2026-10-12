import { createHash } from "node:crypto";
import { env } from "../../../../config/env.js";
import { cacheGet, cacheSet } from "../../../cache/sqliteCache.js";
import { resolveResumeUrl } from "./resolveUrl.js";
import { fetchResumeText } from "./fetchPdf.js";
import { toMetrics, METRIC_IDS } from "./parse.js";

const TTL_MS = env.resumeCacheTtlHours * 3_600_000;
const inflight = new Map();

async function getResumeText(url) {
  const key = `resume:v1:text:${createHash("sha256").update(url).digest("hex")}`;

  const cached = cacheGet(key, TTL_MS);
  if (cached) return cached.text;
  if (inflight.has(key)) return inflight.get(key);

  const promise = (async () => {
    const text = await fetchResumeText(resolveResumeUrl(url));
    cacheSet(key, { text }); // only successes are cached
    return text;
  })().finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}

export default {
  name: "resume",
  source: "resume",
  metricIds: METRIC_IDS,

  async enrich(member) {
    const src = member.sources.resume;
    if (src?.text) return toMetrics(src.text, "form_text");
    if (src?.url) return toMetrics(await getResumeText(src.url), "pdf_text");
    throw new Error("no_resume_text_or_url");
  },
};
