import { describe, expect, it } from "vitest";
import { summarizeUser, toMetrics } from "../src/modules/enrich/enrichers/github/metrics.js";

describe("GitHub profile metric extraction", () => {
  it("summarizes repo, language, contribution, and account-age metrics deterministically", () => {
    const user = {
      createdAt: "2020-01-01T00:00:00Z",
      mergedPrs: 5,
      allRepos: { totalCount: 4 },
      ownRepos: { totalCount: 3, nodes: [
        { isEmpty: false, stargazerCount: 5, primaryLanguage: { name: "TypeScript" }, defaultBranchRef: { target: { history: { totalCount: 3 } } } },
        { isEmpty: false, stargazerCount: 2, primaryLanguage: { name: "JavaScript" }, defaultBranchRef: { target: { history: { totalCount: 1 } } } },
      ] },
      contributionsCollection: { contributionCalendar: { totalContributions: 19, weeks: [{ contributionDays: [
        { date: "2025-01-01", contributionCount: 1 }, { date: "2025-02-01", contributionCount: 0 }, { date: "2025-02-02", contributionCount: 2 },
      ] }] } },
    };
    const stats = summarizeUser(user, Date.parse("2025-03-01T00:00:00Z"));
    expect(stats).toMatchObject({ publicRepos: 4, originalRepos: 3, emptyRepos: 1, starsReceived: 7, activeMonths: 2, languages: ["JavaScript", "TypeScript"] });
    const metrics = toMetrics(stats);
    expect(metrics["github.contributions_1y"]).toMatchObject({ value: 19, status: "ok" });
    expect(metrics["github.forked_ratio"].value).toBe(0.25);
    expect(metrics["github.empty_repo_ratio"].value).toBe(0.5);
  });

  it("returns safe zero ratios when the account has no public repositories", () => {
    const metrics = toMetrics({ createdAt: "2025-01-01T00:00:00Z", fetchedAt: Date.parse("2025-01-02T00:00:00Z"), totalContributions: 0, activeMonths: 0, publicRepos: 0, originalRepos: 0, sampledOriginalRepos: 0, emptyRepos: 0, starsReceived: 0, languages: [], mergedPrs1y: 0, lastActivityDate: null });
    expect(metrics["github.forked_ratio"].value).toBe(0);
    expect(metrics["github.empty_repo_ratio"].value).toBe(0);
  });
});
