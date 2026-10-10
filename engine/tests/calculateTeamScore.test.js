import test from "node:test";
import assert from "node:assert/strict";
import { calculateTeamScore } from "../src/scoring/calculateTeamScore.js";

const criteria = [
  {
    metric: "github.contributions_1y",
    weight: 60,
    aggregation: "mean",
    normalization: { method: "linear", min: 0, max: 100 }
  },
  {
    metric: "resume.project_count",
    weight: 40,
    aggregation: "mean",
    normalization: { method: "linear", min: 0, max: 10 }
  }
];

test("calculates the weighted score when all criteria have data", () => {
  const team = {
    teamId: "T1",
    teamName: "Alpha",
    members: [
      {
        metrics: {
          "github.contributions_1y": { value: 80, status: "ok" },
          "resume.project_count": { value: 5, status: "ok" }
        }
      }
    ]
  };

  const result = calculateTeamScore(team, criteria);

  // GitHub = 80; projects = 50; weighted score = 68.
  assert.equal(result.score, 68);
  assert.equal(result.dataCoverage, 1);
  assert.equal(result.breakdown.length, 2);
});

test("renormalizes weights when a criterion has no data", () => {
  const team = {
    teamId: "T2",
    teamName: "Beta",
    members: [
      {
        metrics: {
          "github.contributions_1y": { value: 80, status: "ok" },
          "resume.project_count": { value: null, status: "not_provided" }
        }
      }
    ]
  };

  const result = calculateTeamScore(team, criteria);

  assert.equal(result.score, 80);
  assert.equal(result.dataCoverage, 0.6);
});

test("returns a null score when no criteria can be evaluated", () => {
  const team = {
    teamId: "T3",
    teamName: "Gamma",
    members: [
      {
        metrics: {
          "github.contributions_1y": { value: null, status: "not_provided" },
          "resume.project_count": { value: null, status: "not_provided" }
        }
      }
    ]
  };

  const result = calculateTeamScore(team, criteria);

  assert.equal(result.score, null);
  assert.equal(result.dataCoverage, 0);
});

test("preserves team identity in the result", () => {
  const result = calculateTeamScore(
    {
      teamId: "T4",
      teamName: "Delta",
      members: [
        {
          metrics: {
            "github.contributions_1y": { value: 50, status: "ok" },
            "resume.project_count": { value: 10, status: "ok" }
          }
        }
      ]
    },
    criteria
  );

  assert.equal(result.teamId, "T4");
  assert.equal(result.teamName, "Delta");
});