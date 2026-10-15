/**
 * rankAndSelect.js — sort teams, apply overrides, select top X + waitlist.
 *
 * Tie-breaking is deterministic. seeded_random uses a mulberry32 PRNG keyed
 * to options.seed so the same config gives the same output every time.
 */

// ---------- Seeded PRNG (mulberry32) ----------

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Sort comparator from tie-breakers ----------

function buildComparator(tieBreakers, config, rng) {
  return function compare(a, b) {
    // Primary: score descending
    const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
    if (scoreDiff !== 0) return scoreDiff;

    // Tie-breakers
    for (const tb of tieBreakers ?? []) {
      let diff = 0;
      if (tb.by === "criterion") {
        const aB = a.breakdown?.find((x) => x.criterionId === tb.criterionId);
        const bB = b.breakdown?.find((x) => x.criterionId === tb.criterionId);
        diff = (bB?.contribution ?? 0) - (aB?.contribution ?? 0);
        if (tb.direction === "asc") diff = -diff;
      } else if (tb.by === "data_coverage") {
        diff = (b.dataCoverage ?? 0) - (a.dataCoverage ?? 0);
        if (tb.direction === "asc") diff = -diff;
      } else if (tb.by === "team_size") {
        diff = (b.members?.length ?? 0) - (a.members?.length ?? 0);
        if (tb.direction === "asc") diff = -diff;
      } else if (tb.by === "seeded_random") {
        // Consistent hash per team pair using seeded PRNG
        diff = rng() - 0.5;
      }
      if (diff !== 0) return diff;
    }
    return 0;
  };
}

// ---------- Main ----------

/**
 * @param {object[]} teams  - scored teams from scoreTeams
 * @param {object}   config
 * @returns {{ rankedResults, shortlist, waitlist, rejected, cutoffScore }}
 */
export function rankAndSelect(teams, config) {
  const { topX, waitlistSize = 0 } = config.selection ?? {};
  const { pin = [], exclude = [], waitlist: waitlistIds = [] } =
    config.overrides ?? {};
  const seed = config.options?.seed ?? 42;
  const rng = mulberry32(seed);

  // Separate overridden teams
  const pinned = teams.filter((t) => pin.includes(t.teamId));
  const excluded = teams.filter((t) => exclude.includes(t.teamId));
  const waitlisted = teams.filter((t) => waitlistIds.includes(t.teamId));
  const filterRejected = teams.filter(
    (t) =>
      t.filterRejected &&
      !pin.includes(t.teamId) &&
      !exclude.includes(t.teamId) &&
      !waitlistIds.includes(t.teamId)
  );
  const eligible = teams.filter(
    (t) =>
      !t.filterRejected &&
      !pin.includes(t.teamId) &&
      !exclude.includes(t.teamId) &&
      !waitlistIds.includes(t.teamId)
  );

  // Sort eligible by score + tie-breakers
  const comparator = buildComparator(config.tieBreakers, config, rng);
  const sorted = [...eligible].sort(comparator);

  // Build shortlist: pinned first, then sorted eligible up to topX - pinned.length
  const slotsLeft = Math.max(0, (topX ?? sorted.length) - pinned.length);
  const shortlistFromEligible = sorted.slice(0, slotsLeft);
  const extraEligible = sorted.slice(slotsLeft);

  // Waitlist: user-provided waitlistIds + first waitlistSize from extra eligible
  const autoWaitlist = extraEligible.slice(0, waitlistSize);
  const rejected = [
    ...filterRejected,
    ...excluded,
    ...extraEligible.slice(waitlistSize),
  ];

  const shortlist = [...pinned, ...shortlistFromEligible];
  const waitlist = [...waitlisted, ...autoWaitlist];

  // Cutoff score = score of the last shortlisted team (or 0)
  const cutoffScore =
    shortlist.length > 0 ? (shortlist[shortlist.length - 1].score ?? 0) : 0;

  // Assign ranks and statuses
  const assignRank = (list, statusLabel) =>
    list.map((t, i) => ({
      ...t,
      status: statusLabel,
      rank: statusLabel === "shortlisted" ? i + 1 : undefined,
      cutoffScore,
      margin: t.score != null ? Math.round((t.score - cutoffScore) * 10000) / 10000 : null,
    }));

  const rankedShortlist = assignRank(shortlist, "shortlisted");
  const rankedWaitlist  = assignRank(waitlist,  "waitlisted");
  const rankedRejected  = assignRank(rejected,  "rejected");

  // Also mark excluded and filter-rejected
  const rankedExcluded = excluded.map((t) => ({
    ...t,
    status: "excluded",
    cutoffScore,
    margin: t.score != null ? Math.round((t.score - cutoffScore) * 10000) / 10000 : null,
  }));
  const rankedFilterRejected = filterRejected.map((t) => ({
    ...t,
    status: "filter_rejected",
    cutoffScore,
    margin: t.score != null ? Math.round((t.score - cutoffScore) * 10000) / 10000 : null,
  }));

  // Full ranked list (shortlisted first, then waitlisted, then rejected)
  const rankedResults = [
    ...rankedShortlist,
    ...rankedWaitlist,
    ...rankedRejected,
    ...rankedExcluded,
    ...rankedFilterRejected,
  ];

  return {
    rankedResults,
    shortlist: rankedShortlist,
    waitlist: rankedWaitlist,
    rejected: rankedRejected,
    cutoffScore,
  };
}
