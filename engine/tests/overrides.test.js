import test from "node:test";
import assert from "node:assert/strict";
import { rankTeams } from "../src/scoring/rankTeams.js";

const scoredTeams = [
  { teamId: "T1", score: 95 },
  { teamId: "T2", score: 85 },
  { teamId: "T3", score: 75 },
  { teamId: "T4", score: 65 }
];

test("pins a team to the top of the shortlist regardless of lower score", () => {
  const result = rankTeams(scoredTeams, 2, {
    overrides: { pin: ["T3"] }
  });

  assert.equal(result.shortlist[0].teamId, "T3");
  assert.equal(result.shortlist[0].isPinned, true);
  assert.equal(result.shortlist[1].teamId, "T1");
  assert.equal(result.shortlist.length, 2);
});

test("excludes a team from the ranking and shortlist", () => {
  const result = rankTeams(scoredTeams, 3, {
    overrides: { exclude: ["T1"] }
  });

  assert.equal(result.excludedTeams.length, 1);
  assert.equal(result.excludedTeams[0].teamId, "T1");
  assert.deepEqual(result.shortlist.map((t) => t.teamId), ["T2", "T3", "T4"]);
});

test("separates waitlisted teams", () => {
  const result = rankTeams(scoredTeams, 2, {
    overrides: { waitlist: ["T2"] }
  });

  assert.equal(result.waitlistTeams.length, 1);
  assert.equal(result.waitlistTeams[0].teamId, "T2");
  assert.deepEqual(result.shortlist.map((t) => t.teamId), ["T1", "T3"]);
});
