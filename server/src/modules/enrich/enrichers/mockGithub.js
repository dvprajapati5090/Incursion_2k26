import { ok } from "../../metrics/metricValue.js";

const LANGS = [
  "TypeScript",
  "JavaScript",
  "Python",
  "Go",
  "Rust",
  "Java",
  "C++",
];

// Deterministic hash so the same URL always gives the same fake data
function hash(str) {
  let h = 2166136261;
  for (const c of str) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export default {
  name: "mock_github",
  source: "github",
  metricIds: [
    "github.contributions_1y",
    "github.public_repos",
    "github.original_repos",
    "github.forked_ratio",
    "github.languages",
  ],

  async enrich(member) {
    const url = member.sources.github.url;
    if (!url) throw new Error("no_url");
    if (url.endsWith("fail")) throw new Error("simulated_fetch_error"); // for testing failures

    const h = hash(url);
    const publicRepos = 3 + ((h >>> 3) % 20);
    const forkedRatio = ((h >>> 5) % 60) / 100;
    const langCount = 1 + (h % 3);
    const languages = Array.from(
      { length: langCount },
      (_, i) => LANGS[(h + i * 3) % LANGS.length],
    );
    const o = { origin: "mock" };

    return {
      "github.contributions_1y": ok("github.contributions_1y", h % 300, o),
      "github.public_repos": ok("github.public_repos", publicRepos, o),
      "github.original_repos": ok(
        "github.original_repos",
        Math.round(publicRepos * (1 - forkedRatio)),
        o,
      ),
      "github.forked_ratio": ok("github.forked_ratio", forkedRatio, o),
      "github.languages": ok("github.languages", [...new Set(languages)], o),
    };
  },
};
