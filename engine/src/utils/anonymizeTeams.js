/**
 * Masks identifiable information (team names, member names, profile handles)
 * to enable blind, bias-reduced evaluation while preserving all performance metrics.
 */
export function anonymizeTeams(teams) {
  if (!Array.isArray(teams)) {
    throw new Error("teams must be an array");
  }

  return teams.map((team, tIdx) => {
    const maskedTeamId = `ANON_TEAM_${String(tIdx + 1).padStart(3, "0")}`;
    const maskedTeamName = `Candidate Team #${tIdx + 1}`;

    const maskedMembers = (team.members ?? []).map((member, mIdx) => {
      const maskedMemberId = `MEMBER_${mIdx + 1}`;
      const maskedMemberName = `Applicant ${mIdx + 1}`;

      // Mask URL usernames in sources while preserving the presence flag
      const maskedSources = {};
      if (member.sources && typeof member.sources === "object") {
        for (const [srcName, srcVal] of Object.entries(member.sources)) {
          if (srcVal && typeof srcVal === "object") {
            maskedSources[srcName] = {
              ...srcVal,
              url: `https://${srcName}.com/anonymized_${maskedMemberId}`
            };
          } else if (srcVal) {
            maskedSources[srcName] = `https://${srcName}.com/anonymized_${maskedMemberId}`;
          }
        }
      }

      return {
        memberId: maskedMemberId,
        name: maskedMemberName,
        sources: maskedSources,
        // All evaluation metrics stay 100% intact
        metrics: structuredClone(member.metrics ?? {})
      };
    });

    return {
      teamId: maskedTeamId,
      teamName: maskedTeamName,
      originalTeamId: team.teamId, // kept for deanonymization after shortlisting
      members: maskedMembers,
      fields: structuredClone(team.fields ?? {})
    };
  });
}
