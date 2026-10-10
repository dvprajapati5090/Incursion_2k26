import test from "node:test";
import assert from "node:assert/strict";
import { runEngine } from "../src/index.js";

const registry = {
  metrics: [
    { id: "github.contributions_1y" },
    { id: "resume.project_count" }
  ]
};

const config = {
  topX: 2,
  criteria: [
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
  ]
};

const teams = [
  {
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
  },
  {
    teamId: "T2",
    teamName: "Beta",
    members: [
      {
        metrics: {
          "github.contributions_1y": { value: 60, status: "ok" },
          "resume.project_count": { value: 8, status: "ok" }
        }
      }
    ]
  },
  {
    teamId: "T3",
    teamName: "Gamma",
    members: [
      {
        metrics: {
          "github.contributions_1y": { value: 40, status: "ok" },
          "resume.project_count": { value: 2, status: "ok" }
        }
      }
    ]
  }
];

test("runs the full scoring and ranking pipeline", () => {
  const result = runEngine(teams, config, registry);

  assert.equal(result.summary.totalTeams, 3);
  assert.equal(result.summary.rankedCount, 3);
  assert.equal(result.summary.shortlistedCount, 2);
  assert.equal(result.summary.unscoredCount, 0);

  assert.deepEqual(
    result.rankedTeams.map((team) => team.teamId),
    ["T1", "T2", "T3"]
  );

  assert.deepEqual(
    result.shortlist.map((team) => team.teamId),
    ["T1", "T2"]
  );

  assert.equal(result.rankedTeams[0].score, 68);
});

test("rejects an invalid configuration", () => {
  assert.throws(
    () => runEngine(teams, { ...config, topX: 0 }, registry),
    /Invalid configuration/
  );
});

test("rejects non-array team input", () => {
  assert.throws(
    () => runEngine(null, config, registry),
    /teams must be an array/
  );
});


test("applies eligibility filters before scoring and ranking", () => {
  const filteredConfig = {
    ...config,
    filters: [
      { field: "team.size", operator: "gte", value: 2 }
    ]
  };

  const teamsWithDifferentSizes = [
    {
      ...teams[0],
      members: [
        ...teams[0].members,
        { metrics: {} }
      ]
    },
    teams[1],
    teams[2]
  ];

  const result = runEngine(teamsWithDifferentSizes, filteredConfig, registry);

  assert.equal(result.summary.totalTeams, 3);
  assert.equal(result.summary.eligibleCount, 1);
  assert.equal(result.summary.rejectedCount, 2);

  assert.deepEqual(
    result.rankedTeams.map((team) => team.teamId),
    ["T1"]
  );

  assert.deepEqual(
    result.rejectedTeams.map((team) => team.teamId),
    ["T2", "T3"]
  );
});

test("sends teams with missing eligibility data to manual review", () => {
  const filteredConfig = {
    ...config,
    filters: [
      { field: "field.registration_status", operator: "eq", value: "complete" }
    ]
  };

  const teamsWithRegistrationData = [
    {
      ...teams[0],
      fields: { registration_status: "complete" }
    },
    teams[1],
    teams[2]
  ];

  const result = runEngine(teamsWithRegistrationData, filteredConfig, registry);

  assert.equal(result.summary.eligibleCount, 1);
  assert.equal(result.summary.reviewCount, 2);
  assert.equal(result.summary.rankedCount, 1);

  assert.deepEqual(
    result.reviewTeams.map((team) => team.teamId),
    ["T2", "T3"]
  );

  assert.deepEqual(
    result.rankedTeams.map((team) => team.teamId),
    ["T1"]
  );
});

test("reports correct counts when filters reject or flag teams", () => {
  const filteredConfig = {
    ...config,
    filters: [
      { field: "field.registration_status", operator: "eq", value: "complete" }
    ]
  };

  const mixedTeams = [
    {
      ...teams[0],
      fields: { registration_status: "complete" }
    },
    {
      ...teams[1],
      fields: { registration_status: "incomplete" }
    },
    teams[2]
  ];

  const result = runEngine(mixedTeams, filteredConfig, registry);

  assert.equal(result.summary.totalTeams, 3);
  assert.equal(result.summary.eligibleCount, 1);
  assert.equal(result.summary.rejectedCount, 1);
  assert.equal(result.summary.reviewCount, 1);
  assert.equal(result.summary.rankedCount, 1);
  assert.equal(result.summary.shortlistedCount, 1);
});
