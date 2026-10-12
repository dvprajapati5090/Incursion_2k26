import { createHash } from "node:crypto";
import { env } from "../../config/env.js";
import { cacheGet, cacheSet } from "../cache/sqliteCache.js";
import * as gemini from "./providers/gemini.js";
import * as ollama from "./providers/ollama.js";

const PROVIDERS = { gemini, ollama };
const TTL_MS = env.llm.cacheTtlHours * 3_600_000;
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const llmEnabled = () =>
  env.llm.mode !== "off" && env.llm.provider in PROVIDERS;
export const llmModelName = () =>
  env.llm.provider === "gemini" ? env.llm.geminiModel : env.llm.ollamaModel;

// Space out real calls (cache hits skip this) to stay under free-tier requests/minute.
let nextSlot = 0;
async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + env.llm.minIntervalMs;
  if (wait) await sleep(wait);
}

const stripFences = (s) =>
  s
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

export async function extractStructured({
  task,
  promptVersion,
  system,
  prompt,
  schema,
}) {
  const provider = PROVIDERS[env.llm.provider];
  const hash = createHash("sha256").update(system).update(prompt).digest("hex");
  const key = `llm:${task}:${promptVersion}:${env.llm.provider}:${llmModelName()}:${hash}`;

  const cached = cacheGet(key, TTL_MS);
  if (cached) return cached;

  for (let attempt = 0; ; attempt++) {
    let raw;
    try {
      await throttle();
      raw = await provider.generateJson({ system, prompt });
    } catch (e) {
      if (RETRYABLE.has(e.status) && attempt < 3) {
        await sleep(2000 * 2 ** attempt);
        continue;
      }
      throw new Error(`llm_request_failed: ${String(e.message).slice(0, 120)}`);
    }

    let data;
    try {
      data = JSON.parse(stripFences(raw));
    } catch {
      throw new Error("llm_output_not_json");
    }
    const parsed = schema.safeParse(data);
    if (!parsed.success) throw new Error("llm_output_failed_validation");

    cacheSet(key, parsed.data); // only validated output is cached
    return parsed.data;
  }
}
