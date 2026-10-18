import { describe, expect, it, vi } from "vitest";

vi.mock("../src/cache/sqliteCache.js", () => ({
  cacheGet: () => null,
  cacheSet: () => {},
}));

vi.mock("../src/modules/enrich/enrichers/portfolio/safeFetch.js", () => ({
  safeFetchHtml: async () => {
    throw new Error("connection_refused");
  },
}));

vi.mock("../src/modules/enrich/enrichers/portfolio/parse.js", () => ({
  METRIC_IDS: [
    "portfolio.is_reachable",
    "portfolio.project_count",
    "portfolio.has_live_demo",
    "portfolio.tech_stack",
    "portfolio.text",
  ],
  toMetrics: () => ({}),
}));

import portfolio from "../src/modules/enrich/enrichers/portfolio/index.js";

describe("portfolio enricher reachability fallback", () => {
  it("reports no live demo when the portfolio site cannot be reached", async () => {
    const metrics = await portfolio.enrich({
      sources: { portfolio: { url: "https://portfolio.example" } },
    });

    expect(metrics["portfolio.is_reachable"]).toMatchObject({
      value: false,
      status: "ok",
      origin: "http_check",
      error: "connection_refused",
    });
    expect(metrics["portfolio.has_live_demo"]).toMatchObject({
      value: false,
      status: "ok",
      origin: "http_check",
    });
    expect(metrics["portfolio.project_count"]).toMatchObject({
      value: null,
      status: "fetch_failed",
    });
  });
});
