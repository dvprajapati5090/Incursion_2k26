import { test } from "vitest";
import assert from "node:assert/strict";
import { compareTeams } from "../src/comparison/compareTeams.js";

test("performs pairwise comparison identifying winner and per-criteria margins", () => {
  const teamA = {
    teamId: "T1",
    teamName: "Alpha",
    score: 82,
    breakdown: [
      { metric: "github.contributions_1y", score: 90, weight: 60 },
      { metric: "resume.project_count", score: 70, weight: 40 }
    ]
  };

  const teamB = {
    teamId: "T2",
    teamName: "Beta",
    score: 75,
    breakdown: [
      { metric: "github.contributions_1y", score: 70, weight: 60 },
      { metric: "resume.project_count", score: 82, weight: 40 }
    ]
  };

  const comp = compareTeams(teamA, teamB);

  assert.equal(comp.teamAId, "T1");
  assert.equal(comp.teamBId, "T2");
  assert.equal(comp.overallWinner, "teamA");
  assert.equal(comp.overallScoreDiff, 7);
  assert.equal(comp.teamAWins, 1);
  assert.equal(comp.teamBWins, 1);
  assert.ok(comp.summary.includes("Alpha leads Beta"));
  assert.equal(comp.criteriaComparison.length, 2);

  const ghCrit = comp.criteriaComparison.find((c) => c.metric === "github.contributions_1y");
  assert.equal(ghCrit.winner, "teamA");
  assert.equal(ghCrit.scoreDiff, 20);

  const resCrit = comp.criteriaComparison.find((c) => c.metric === "resume.project_count");
  assert.equal(resCrit.winner, "teamB");
  assert.equal(resCrit.scoreDiff, -12);
});

test("handles ties in pairwise comparison", () => {
  const teamA = {
    teamId: "T1",
    teamName: "Alpha",
    score: 80,
    breakdown: [{ metric: "m1", score: 80, weight: 1 }]
  };

  const teamB = {
    teamId: "T2",
    teamName: "Beta",
    score: 80,
    breakdown: [{ metric: "m1", score: 80, weight: 1 }]
  };

  const comp = compareTeams(teamA, teamB);
  assert.equal(comp.overallWinner, "tie");
  assert.equal(comp.overallScoreDiff, 0);
  assert.equal(comp.ties, 1);
});
