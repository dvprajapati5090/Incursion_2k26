import test from "node:test";
import assert from "node:assert/strict";
import { rankTeams } from "../src/scoring/rankTeams.js";

const teams = [
  { teamId: "T3", teamName: "Gamma", score: 65 },
  { teamId: "T1", teamName: "Alpha", score: 90 },
  { teamId: "T2", teamName: "Beta", score: 75 },
  { teamId: "T4", teamName: "Delta", score: null }
];

test("sorts teams by descending score", () => {
  const result = rankTeams(teams, 3);

  assert.deepEqual(
    result.rankedTeams.map((team) => team.teamId),
    ["T1", "T2", "T3"]
  );
});

test("returns only the top X teams in the shortlist", () => {
  const result = rankTeams(teams, 2);

  assert.equal(result.shortlist.length, 2);
  assert.deepEqual(
    result.shortlist.map((team) => team.teamId),
    ["T1", "T2"]
  );
});

test("excludes teams with null scores", () => {
  const result = rankTeams(teams, 10);

  assert.equal(result.rankedTeams.length, 3);
  assert.ok(
    result.rankedTeams.every((team) => typeof team.score === "number")
  );
});

test("breaks ties deterministically using teamId", () => {
  const tiedTeams = [
    { teamId: "T2", score: 80 },
    { teamId: "T1", score: 80 }
  ];

  const result = rankTeams(tiedTeams, 2);

  assert.deepEqual(
    result.rankedTeams.map((team) => team.teamId),
    ["T1", "T2"]
  );
});

test("assigns ranks starting from one", () => {
  const result = rankTeams(teams, 3);

  assert.deepEqual(
    result.rankedTeams.map((team) => team.rank),
    [1, 2, 3]
  );
});

test("rejects invalid topX", () => {
  assert.throws(() => rankTeams(teams, 0), /topX must be a positive integer/);
});

test("rejects non-array input", () => {
  assert.throws(() => rankTeams(null, 3), /scoredTeams must be an array/);
});