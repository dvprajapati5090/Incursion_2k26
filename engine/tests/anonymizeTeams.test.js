import test from "node:test";
import assert from "node:assert/strict";
import { anonymizeTeams } from "../src/utils/anonymizeTeams.js";

const rawTeams = [
  {
    teamId: "T_REAL_1",
    teamName: "Super Hackers",
    members: [
      {
        memberId: "M_JOHN",
        name: "John Doe",
        sources: {
          github: { url: "https://github.com/johndoe" }
        },
        metrics: {
          "github.contributions_1y": { status: "ok", value: 120 }
        }
      }
    ]
  }
];

test("anonymizes team names and member identifiers while keeping metrics intact", () => {
  const anonymized = anonymizeTeams(rawTeams);

  assert.equal(anonymized.length, 1);
  const team = anonymized[0];

  assert.equal(team.teamId, "ANON_TEAM_001");
  assert.equal(team.teamName, "Candidate Team #1");
  assert.equal(team.originalTeamId, "T_REAL_1");

  const member = team.members[0];
  assert.equal(member.name, "Applicant 1");
  assert.notEqual(member.sources.github.url, "https://github.com/johndoe");

  // Critical: metrics remain exactly the same for scoring accuracy
  assert.deepEqual(
    member.metrics["github.contributions_1y"],
    { status: "ok", value: 120 }
  );
});
