
import { test } from "vitest";
import assert from "node:assert/strict";
import { applyEligibilityFilters } from "../src/filters/applyEligibilityFilters.js";

const teams = [
  {
    teamId: "T1",
    teamName: "Alpha",
    members: [{}, {}, {}],
    fields: { registration: "valid" }
  },
  {
    teamId: "T2",
    teamName: "Beta",
    members: [{}],
    fields: { registration: "valid" }
  },
  {
    teamId: "T3",
    teamName: "Gamma",
    members: [{}, {}],
    fields: {}
  }
];

test("accepts teams that pass all eligibility filters", () => {
  const result = applyEligibilityFilters(teams, [
    { field: "team.size", operator: "gte", value: 2 },
    { field: "field.registration", operator: "eq", value: "valid" }
  ]);

  assert.deepEqual(
    result.eligibleTeams.map((team) => team.teamId),
    ["T1"]
  );
});

test("rejects teams that fail a mandatory rule", () => {
  const result = applyEligibilityFilters(teams, [
    { field: "team.size", operator: "gte", value: 2 }
  ]);

  assert.deepEqual(
    result.rejectedTeams.map((team) => team.teamId),
    ["T2"]
  );
});

test("sends teams with missing required data to manual review", () => {
  const result = applyEligibilityFilters(teams, [
    { field: "field.registration", operator: "eq", value: "valid" }
  ]);

  assert.deepEqual(
    result.reviewTeams.map((team) => team.teamId),
    ["T3"]
  );
});

test("does not reject teams when no filters are configured", () => {
  const result = applyEligibilityFilters(teams);

  assert.equal(result.eligibleTeams.length, 3);
  assert.equal(result.rejectedTeams.length, 0);
  assert.equal(result.reviewTeams.length, 0);
});

test("rejects unsupported filter operators", () => {
  assert.throws(
    () =>
      applyEligibilityFilters(teams, [
        { field: "team.size", operator: "unknown", value: 2 }
      ]),
    /Unsupported filter operator/
  );
});

test("evaluates member-level rules with any_member scope (e.g. min 50 github contributions)", () => {
  const memberTeams = [
    {
      teamId: "T_PASS",
      members: [
        { metrics: { "github.contributions_1y": { status: "ok", value: 10 } } },
        { metrics: { "github.contributions_1y": { status: "ok", value: 65 } } }
      ]
    },
    {
      teamId: "T_FAIL",
      members: [
        { metrics: { "github.contributions_1y": { status: "ok", value: 12 } } },
        { metrics: { "github.contributions_1y": { status: "ok", value: 20 } } }
      ]
    },
    {
      teamId: "T_REVIEW",
      members: [
        { metrics: { "github.contributions_1y": { status: "ok", value: 10 } } },
        { metrics: { "github.contributions_1y": { status: "not_provided", value: null } } }
      ]
    }
  ];

  const filter = {
    field: "github.contributions_1y",
    scope: "any_member",
    operator: "gte",
    value: 50
  };

  const result = applyEligibilityFilters(memberTeams, [filter]);

  assert.deepEqual(result.eligibleTeams.map((t) => t.teamId), ["T_PASS"]);
  assert.deepEqual(result.rejectedTeams.map((t) => t.teamId), ["T_FAIL"]);
  assert.deepEqual(result.reviewTeams.map((t) => t.teamId), ["T_REVIEW"]);
});

test("evaluates member-level rules with all_members scope", () => {
  const memberTeams = [
    {
      teamId: "T_ALL_PASS",
      members: [
        { metrics: { "resume.project_count": { status: "ok", value: 2 } } },
        { metrics: { "resume.project_count": { status: "ok", value: 3 } } }
      ]
    },
    {
      teamId: "T_ONE_FAILS",
      members: [
        { metrics: { "resume.project_count": { status: "ok", value: 2 } } },
        { metrics: { "resume.project_count": { status: "ok", value: 0 } } }
      ]
    }
  ];

  const filter = {
    field: "resume.project_count",
    scope: "all_members",
    operator: "gte",
    value: 1
  };

  const result = applyEligibilityFilters(memberTeams, [filter]);

  assert.deepEqual(result.eligibleTeams.map((t) => t.teamId), ["T_ALL_PASS"]);
  assert.deepEqual(result.rejectedTeams.map((t) => t.teamId), ["T_ONE_FAILS"]);
});

