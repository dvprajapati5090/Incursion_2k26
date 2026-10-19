/**
 * Performs pairwise / head-to-head comparison between two teams
 * across all configured scoring criteria.
 */
export function compareTeams(teamA, teamB) {
  if (!teamA || !teamB || typeof teamA !== "object" || typeof teamB !== "object") {
    throw new Error("Both teamA and teamB must be valid objects");
  }

  const breakdownA = new Map(
    (teamA.breakdown ?? []).map((b) => [b.metric || b.criterionId || b.id || b.label, b])
  );
  const breakdownB = new Map(
    (teamB.breakdown ?? []).map((b) => [b.metric || b.criterionId || b.id || b.label, b])
  );

  const allMetrics = Array.from(
    new Set([...breakdownA.keys(), ...breakdownB.keys()])
  ).filter(Boolean);

  let teamAWins = 0;
  let teamBWins = 0;
  let ties = 0;

  const comparison = allMetrics.map((metric) => {
    const itemA = breakdownA.get(metric);
    const itemB = breakdownB.get(metric);

    const scoreA = itemA?.score ?? itemA?.contribution ?? null;
    const scoreB = itemB?.score ?? itemB?.contribution ?? null;
    const weight = itemA?.weight ?? itemA?.effectiveWeight ?? itemB?.weight ?? itemB?.effectiveWeight ?? 1;
    const label = itemA?.label ?? itemB?.label ?? metric;

    let winner = "tie";
    let diff = null;

    if (scoreA !== null && scoreB !== null) {
      diff = scoreA - scoreB;
      if (diff > 0.001) {
        winner = "teamA";
        teamAWins++;
      } else if (diff < -0.001) {
        winner = "teamB";
        teamBWins++;
      } else {
        winner = "tie";
        ties++;
      }
    } else if (scoreA !== null && scoreB === null) {
      winner = "teamA";
      diff = scoreA;
      teamAWins++;
    } else if (scoreA === null && scoreB !== null) {
      winner = "teamB";
      diff = -scoreB;
      teamBWins++;
    } else {
      ties++;
    }

    return {
      metric,
      weight,
      teamAScore: scoreA,
      teamBScore: scoreB,
      winner,
      scoreDiff: diff !== null ? Number(diff.toFixed(2)) : null
    };
  });

  const scoreA = teamA.score ?? 0;
  const scoreB = teamB.score ?? 0;
  const overallDiff = Number((scoreA - scoreB).toFixed(2));

  let overallWinner = "tie";
  if (overallDiff > 0.001) {
    overallWinner = "teamA";
  } else if (overallDiff < -0.001) {
    overallWinner = "teamB";
  }

  const nameA = teamA.teamName ?? teamA.teamId ?? "Team A";
  const nameB = teamB.teamName ?? teamB.teamId ?? "Team B";

  let summary = "";
  if (overallWinner === "teamA") {
    summary = `${nameA} leads ${nameB} by +${overallDiff} composite points (won ${teamAWins} of ${comparison.length} criteria).`;
  } else if (overallWinner === "teamB") {
    summary = `${nameB} leads ${nameA} by +${Math.abs(overallDiff)} composite points (won ${teamBWins} of ${comparison.length} criteria).`;
  } else {
    summary = `${nameA} and ${nameB} are tied with identical composite scores.`;
  }

  function extractRejectionReasons(team) {
    const reasons = [];
    if (!team) return reasons;

    if (team.status === "excluded") {
      reasons.push("Manually excluded from shortlist by organizer override");
    } else if (team.status === "filter_rejected") {
      if (Array.isArray(team.filterResults)) {
        const failed = team.filterResults.filter((f) => f.status === "fail");
        for (const f of failed) {
          reasons.push(
            f.reason ||
            `Failed Eligibility Filter: "${f.label || f.metric}" (Required ${f.op || 'condition'} ${f.value ?? ''})`
          );
        }
      }
      if (reasons.length === 0 && Array.isArray(team.rejectionReasons)) {
        reasons.push(...team.rejectionReasons);
      }
      if (reasons.length === 0) {
        reasons.push("Disqualified by eligibility filter rules");
      }
    } else if (team.status === "rejected") {
      if (team.margin != null && team.margin < 0) {
        reasons.push(
          `Scored below qualification cutoff threshold (deficit of ${Math.abs(team.margin).toFixed(2)} pts)`
        );
      } else {
        reasons.push("Placed below qualification cutoff threshold in competitive ranking");
      }
    }

    if (reasons.length === 0 && Array.isArray(team.reasons)) {
      for (const r of team.reasons) {
        if (typeof r === "string") {
          reasons.push(r);
        } else if (r && typeof r === "object") {
          if (r.message) {
            reasons.push(r.message);
          } else if (r.code) {
            reasons.push(r.margin != null ? `${r.code} (margin: ${r.margin})` : r.code);
          } else {
            reasons.push(JSON.stringify(r));
          }
        }
      }
    }

    return reasons;
  }

  function extractFlags(team) {
    const flags = [];
    if (Array.isArray(team?.flags)) {
      flags.push(...team.flags);
    }
    if (Array.isArray(team?.members)) {
      for (const m of team.members) {
        if (Array.isArray(m.flags)) {
          for (const fl of m.flags) {
            flags.push({
              ...fl,
              memberName: m.name || m.memberId,
              memberId: m.memberId,
            });
          }
        }
      }
    }
    return flags;
  }

  const statusA = teamA.status || "unspecified";
  const statusB = teamB.status || "unspecified";
  const rejectionsA = extractRejectionReasons(teamA);
  const rejectionsB = extractRejectionReasons(teamB);

  let narrative = summary;
  if (statusA !== statusB) {
    narrative += ` Status: ${nameA} is ${statusA.toUpperCase()} while ${nameB} is ${statusB.toUpperCase()}.`;
  }
  if (rejectionsA.length > 0) {
    narrative += ` ${nameA} rejection: ${rejectionsA.join("; ")}.`;
  }
  if (rejectionsB.length > 0) {
    narrative += ` ${nameB} rejection: ${rejectionsB.join("; ")}.`;
  }

  return {
    teamAId: teamA.teamId,
    teamBId: teamB.teamId,
    overallWinner,
    overallScoreDiff: overallDiff,
    criteriaComparison: comparison,
    teamAWins,
    teamBWins,
    ties,
    summary,
    narrative,
    teamA: {
      teamId: teamA.teamId,
      teamName: nameA,
      score: scoreA,
      rank: teamA.rank ?? null,
      status: statusA,
      margin: teamA.margin ?? null,
      rejectionReasons: rejectionsA,
      flags: extractFlags(teamA),
      fields: teamA.fields ?? {},
      members: teamA.members ?? [],
      breakdown: teamA.breakdown ?? [],
    },
    teamB: {
      teamId: teamB.teamId,
      teamName: nameB,
      score: scoreB,
      rank: teamB.rank ?? null,
      status: statusB,
      margin: teamB.margin ?? null,
      rejectionReasons: rejectionsB,
      flags: extractFlags(teamB),
      fields: teamB.fields ?? {},
      members: teamB.members ?? [],
      breakdown: teamB.breakdown ?? [],
    },
    statusComparison: {
      teamAStatus: statusA,
      teamBStatus: statusB,
      teamARejectionReasons: rejectionsA,
      teamBRejectionReasons: rejectionsB,
      isDifferentStatus: statusA !== statusB,
    },
  };
}
