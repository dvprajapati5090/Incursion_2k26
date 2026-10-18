import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cache, cacheGet, cacheSet, fetchGithubProfile } = vi.hoisted(() => {
  const cache = new Map();
  return { cache, cacheGet: vi.fn((key) => cache.get(key) ?? null), cacheSet: vi.fn((key, value) => cache.set(key, value)), fetchGithubProfile: vi.fn() };
});
vi.mock("../src/modules/cache/sqliteCache.js", () => ({ cacheGet, cacheSet }));
vi.mock("../src/modules/enrich/enrichers/github/client.js", () => ({ fetchGithubProfile }));
const { default: github } = await import("../src/modules/enrich/enrichers/github/index.js");

beforeEach(() => { cache.clear(); vi.clearAllMocks(); });
afterEach(() => vi.restoreAllMocks());

const profile = {
  createdAt: "2020-01-01T00:00:00Z",
  mergedPrs: 4,
  allRepos: { totalCount: 2 },
  ownRepos: { totalCount: 1, nodes: [{ isEmpty: false, stargazerCount: 3, primaryLanguage: { name: "JavaScript" }, defaultBranchRef: { target: { history: { totalCount: 4 } } } }] },
  contributionsCollection: { contributionCalendar: { totalContributions: 22, weeks: [{ contributionDays: [{ date: "2025-02-01", contributionCount: 2 }] }] } },
};

describe("GitHub enrichment cache boundary", () => {
  it("fetches a cache miss once, then serves the cached metrics", async () => {
    fetchGithubProfile.mockResolvedValue(profile);
    const member = { sources: { github: { url: "https://github.com/octocat" } } };
    const first = await github.enrich(member);
    const second = await github.enrich(member);
    expect(first).toEqual(second);
    expect(first["github.contributions_1y"].value).toBe(22);
    expect(fetchGithubProfile).toHaveBeenCalledOnce();
    expect(cacheSet).toHaveBeenCalledOnce();
  });

  it("rejects missing and invalid GitHub profile links before an API request", async () => {
    await expect(github.enrich({ sources: {} })).rejects.toThrow("invalid_github_url");
    await expect(github.enrich({ sources: { github: { url: "https://github.com/settings" } } })).rejects.toThrow("invalid_github_url");
    expect(fetchGithubProfile).not.toHaveBeenCalled();
  });
});
