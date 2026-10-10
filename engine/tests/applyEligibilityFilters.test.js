
import test from "node:test";
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
