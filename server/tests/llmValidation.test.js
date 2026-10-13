import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const { cache, cacheGet, cacheSet, generateJson } = vi.hoisted(() => {
  const cache = new Map();
  return {
    cache,
    cacheGet: vi.fn((key) => cache.get(key) ?? null),
    cacheSet: vi.fn((key, value) => cache.set(key, value)),
    generateJson: vi.fn(),
  };
});
vi.mock("../src/config/env.js", () => ({ env: { llm: { provider: "ollama", mode: "auto", ollamaModel: "test-model", minIntervalMs: 0, cacheTtlHours: 24 } } }));
vi.mock("../src/modules/cache/sqliteCache.js", () => ({ cacheGet, cacheSet }));
vi.mock("../src/modules/llm/providers/ollama.js", () => ({ generateJson }));
vi.mock("../src/modules/llm/providers/gemini.js", () => ({ generateJson: vi.fn() }));
const { extractStructured } = await import("../src/modules/llm/index.js");
const { default: resumeLlm } = await import("../src/modules/enrich/refiners/resumeLlm.js");

beforeEach(() => { cache.clear(); vi.clearAllMocks(); });
afterEach(() => vi.useRealTimers());

const request = { task: "test", promptVersion: "v1", system: "system", prompt: "prompt", schema: z.object({ count: z.number() }) };

describe("structured LLM output validation and cache", () => {
  it("strips JSON fences, validates output, and reuses validated cache data", async () => {
    generateJson.mockResolvedValue('```json\n{"count":3}\n```');
    await expect(extractStructured(request)).resolves.toEqual({ count: 3 });
    await expect(extractStructured(request)).resolves.toEqual({ count: 3 });
    expect(generateJson).toHaveBeenCalledOnce();
    expect(cacheSet).toHaveBeenCalledOnce();
  });

  it("reports malformed JSON and schema-invalid output distinctly", async () => {
    generateJson.mockResolvedValueOnce("not json").mockResolvedValueOnce('{"count":"three"}');
    await expect(extractStructured({ ...request, prompt: "malformed" })).rejects.toThrow("llm_output_not_json");
    await expect(extractStructured({ ...request, prompt: "invalid schema" })).rejects.toThrow("llm_output_failed_validation");
    expect(cacheSet).not.toHaveBeenCalled();
  });

  it("retries retryable provider errors, then returns a useful failure", async () => {
    vi.useFakeTimers();
    generateJson.mockRejectedValue(Object.assign(new Error("busy"), { status: 429 }));
    const pending = extractStructured({ ...request, prompt: "retry" });
    const assertion = expect(pending).rejects.toThrow("llm_request_failed: busy");
    await vi.runAllTimersAsync();
    await assertion;
    expect(generateJson).toHaveBeenCalledTimes(4);
  });

  it("keeps only resume facts grounded in source text and reports confidence", async () => {
    generateJson.mockResolvedValue(JSON.stringify({
      projects: [{ name: "Portfolio", quote: "Built portfolio site" }, { name: "Invented", quote: "not in source" }],
      achievements: [], certifications: [], publications: [], experience: [],
      skills: ["React", "Python"], education: { level: "bachelors", quote: "Bachelor degree" },
    }));
    const member = { metrics: {
      "resume.text": { value: "Built portfolio site using React. Bachelor degree", status: "ok" },
      "resume.project_count": { value: 0, status: "low_confidence" },
    } };
    expect(resumeLlm.shouldRun(member)).toBe(true);
    vi.useFakeTimers();
    const pending = resumeLlm.refine(member);
    const refinedPromise = Promise.resolve(pending);
    await vi.runAllTimersAsync();
    const refined = await refinedPromise;
    expect(refined["resume.project_count"]).toMatchObject({ value: 1, status: "low_confidence", origin: "llm", confidence: 0.43 });
    expect(refined["resume.skills"].value).toEqual(["React"]);
    expect(refined["resume.education_level"].value).toBe(3);
  });
});
