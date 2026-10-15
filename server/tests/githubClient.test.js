import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchGithubProfile } from "../src/modules/enrich/enrichers/github/client.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const response = (status, body, headers = {}) => ({
  status,
  headers: new Headers(headers),
  json: async () => body,
});

describe("GitHub GraphQL client", () => {
  it("returns the profile from a successful API response", async () => {
    const profile = { user: { createdAt: "2020-01-01", allRepos: { totalCount: 2 } } };
    const fetchMock = vi.fn().mockResolvedValue(response(200, { data: profile }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchGithubProfile("octocat")).resolves.toEqual(profile.user);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][1].body).toContain("octocat");
  });

  it("reports unknown profiles and rate limits without retrying fatal responses", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(200, { errors: [{ type: "NOT_FOUND", message: "missing" }] }))
      .mockResolvedValueOnce(response(429, {}, { "x-ratelimit-remaining": "0" }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchGithubProfile("unknown-user")).rejects.toThrow("github_user_not_found");
    await expect(fetchGithubProfile("octocat")).rejects.toThrow("github_rate_limited");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries transient server failures and reports the final error", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(response(503, {}));
    vi.stubGlobal("fetch", fetchMock);
    const pending = fetchGithubProfile("octocat");
    const assertion = expect(pending).rejects.toThrow("github_http_503");
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("retries network timeouts and preserves the final timeout message", async () => {
    vi.useFakeTimers();
    const timeout = Object.assign(new Error("request timed out"), { name: "TimeoutError" });
    const fetchMock = vi.fn().mockRejectedValue(timeout);
    vi.stubGlobal("fetch", fetchMock);
    const pending = fetchGithubProfile("octocat");
    const assertion = expect(pending).rejects.toThrow("request timed out");
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
