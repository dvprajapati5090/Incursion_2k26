import { test } from "vitest";
import assert from "node:assert/strict";
import { rankTeams } from "../src/scoring/rankTeams.js";

test("breaks ties using dataCoverage when configured", () => {
  const scoredTeams = [
    {
      teamId: "T_LESS_COVERAGE",
      score: 80,
      dataCoverage: 0.6,
      breakdown: []
    },
    {
      teamId: "T_MORE_COVERAGE",
      score: 80,
      dataCoverage: 0.9,
      breakdown: []
    }
  ];

  const result = rankTeams(scoredTeams, 2, {
    tieBreakers: ["dataCoverage", "teamId"]
  });

  assert.equal(result.rankedTeams[0].teamId, "T_MORE_COVERAGE");
  assert.equal(result.rankedTeams[1].teamId, "T_LESS_COVERAGE");
});

test("breaks ties using specific metric in breakdown when configured", () => {
  const scoredTeams = [
    {
      teamId: "T_LOWER_METRIC",
      score: 80,
      breakdown: [{ metric: "github.contributions_1y", score: 60 }]
    },
    {
      teamId: "T_HIGHER_METRIC",
      score: 80,
      breakdown: [{ metric: "github.contributions_1y", score: 90 }]
    }
  ];

  const result = rankTeams(scoredTeams, 2, {
    tieBreakers: ["github.contributions_1y", "teamId"]
  });

  assert.equal(result.rankedTeams[0].teamId, "T_HIGHER_METRIC");
  assert.equal(result.rankedTeams[1].teamId, "T_LOWER_METRIC");
});
