import test from "node:test";
import assert from "node:assert/strict";
import { exportShortlist } from "../src/export/exportShortlist.js";

const sampleResult = {
  summary: { totalTeams: 2, shortlistedCount: 1 },
  shortlist: [
    {
      rank: 1,
      teamId: "T1",
      teamName: "Alpha Team",
      score: 88.5,
      dataCoverage: 0.9,
      isPinned: false,
      explanation: {
        summary: "Ranked #1 with strong scores.",
        strengths: ["Strong GitHub"],
        growthAreas: []
      }
    }
  ]
};

const sampleConfig = { topX: 1, criteria: [] };

test("exports shortlist in JSON format bundled with configuration", () => {
  const jsonStr = exportShortlist(sampleResult, sampleConfig, "json");
  const parsed = JSON.parse(jsonStr);

  assert.ok(parsed.exportedAt);
  assert.deepEqual(parsed.configuration, sampleConfig);
  assert.equal(parsed.shortlist.length, 1);
  assert.equal(parsed.shortlist[0].teamId, "T1");
  assert.equal(parsed.shortlist[0].score, 88.5);
});

test("exports shortlist in CSV format", () => {
  const csvStr = exportShortlist(sampleResult, sampleConfig, "csv");
  const lines = csvStr.split("\n");

  assert.ok(lines[0].includes("Rank,Team ID,Team Name,Score"));
  assert.ok(lines[1].includes("1,T1,Alpha Team,88.50"));
});
