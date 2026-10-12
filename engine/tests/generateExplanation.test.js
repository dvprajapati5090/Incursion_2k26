import test from "node:test";
import assert from "node:assert/strict";
import { generateExplanation } from "../src/explain/generateExplanation.js";

test("generates explanation for a scored team with strengths and missing data notes", () => {
  const scoredTeam = {
    teamId: "T1",
    teamName: "Alpha",
    rank: 1,
    score: 85.5,
    dataCoverage: 0.75,
    breakdown: [
      { metric: "github.contributions_1y", score: 95, weight: 60 },
      { metric: "resume.project_count", score: 70, weight: 20 },
      { metric: "portfolio.project_count", score: null, weight: 20 }
    ]
  };

  const exp = generateExplanation(scoredTeam);

  assert.equal(exp.teamId, "T1");
  assert.equal(exp.status, "scored");
  assert.equal(exp.score, 85.5);
  assert.equal(exp.rank, 1);
  assert.ok(exp.summary.includes("Ranked #1"));
  assert.ok(exp.summary.includes("85.5/100"));
  assert.ok(exp.strengths.length > 0);
  assert.ok(exp.strengths[0].includes("github.contributions_1y"));
  assert.equal(exp.missingDataNotes.length, 1);
  assert.ok(exp.missingDataNotes[0].includes("portfolio.project_count"));
});

test("generates explanation for a rejected team", () => {
  const rejectedTeam = {
    teamId: "T2",
    teamName: "Beta",
    eligibilityReasons: ["Failed rule: no member met github.contributions_1y >= 50"]
  };

  const exp = generateExplanation(rejectedTeam);

  assert.equal(exp.teamId, "T2");
  assert.equal(exp.status, "rejected");
  assert.equal(exp.score, null);
  assert.ok(exp.summary.includes("Rejected from shortlist"));
  assert.ok(exp.reasons[0].includes("github.contributions_1y"));
});

test("generates explanation for a team needing manual review", () => {
  const reviewTeam = {
    teamId: "T3",
    teamName: "Gamma",
    eligibilityReasons: ["Missing data for rule: at least one member with github.contributions_1y >= 50"]
  };

  const exp = generateExplanation(reviewTeam);

  assert.equal(exp.teamId, "T3");
  assert.equal(exp.status, "review");
  assert.ok(exp.summary.includes("Flagged for organizer review"));
});
