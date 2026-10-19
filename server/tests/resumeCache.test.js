import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cache, cacheGet, cacheSet, fetchResumeText } = vi.hoisted(() => {
  const cache = new Map();
  return {
    cache,
    cacheGet: vi.fn((key) => cache.get(key) ?? null),
    cacheSet: vi.fn((key, value) => cache.set(key, value)),
    fetchResumeText: vi.fn(),
  };
});
vi.mock("../src/modules/cache/sqliteCache.js", () => ({ cacheGet, cacheSet }));
vi.mock("../src/modules/enrich/enrichers/resume/fetchPdf.js", () => ({
  fetchResumeText,
}));
const { default: resume } = await import(
  "../src/modules/enrich/enrichers/resume/index.js"
);

beforeEach(() => {
  cache.clear();
  vi.clearAllMocks();
});
afterEach(() => vi.restoreAllMocks());

describe("resume enrichment cache", () => {
  it("reuses cached extracted text for the same resume URL", async () => {
    fetchResumeText.mockResolvedValue(
      "Skills\nReact, Node\nProjects\nProject A\n- Built app\nEducation\nBachelor degree",
    );
    const member = {
      sources: { resume: { url: "https://example.test/resume.pdf" } },
    };
    const ctx = { asOf: Date.parse("2026-01-01T00:00:00Z") };
    const first = await resume.enrich(member, ctx);
    const second = await resume.enrich(member, ctx);
    expect(first).toEqual(second);
    expect(first["resume.skills"].value).toEqual(["React", "Node"]);
    expect(fetchResumeText).toHaveBeenCalledOnce();
  });

  it("does not cache failed resume downloads", async () => {
    fetchResumeText
      .mockRejectedValueOnce(new Error("resume_fetch_timeout"))
      .mockResolvedValueOnce(
        "A sufficiently long resume text with several details for parser validation and coverage.",
      );
    const member = {
      sources: { resume: { url: "https://example.test/retry.pdf" } },
    };
    const ctx = { asOf: Date.parse("2026-01-01T00:00:00Z") };
    await expect(resume.enrich(member, ctx)).rejects.toThrow(
      "resume_fetch_timeout",
    );
    await expect(resume.enrich(member, ctx)).resolves.toHaveProperty(
      "resume.text",
    );
    expect(fetchResumeText).toHaveBeenCalledTimes(2);
  });
});
