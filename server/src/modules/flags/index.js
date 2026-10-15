import { flagDuplicateUrls, flagSimilarResumes } from "./duplicates.js";
import { flagProfileSignals } from "./profileSignals.js";

// Mutates member.flags; returns counts per flag code for the enrichment summary.
export function detectFlags(teams) {
  const entries = teams.flatMap((t) =>
    t.members.map((member) => ({ teamId: t.teamId, member })),
  );

  flagDuplicateUrls(entries);
  flagSimilarResumes(entries);
  for (const { member } of entries)
    member.flags.push(...flagProfileSignals(member));

  const counts = {};
  for (const { member } of entries) {
    for (const f of member.flags) counts[f.code] = (counts[f.code] || 0) + 1;
  }
  return counts;
}
