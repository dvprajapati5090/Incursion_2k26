/**
 * Engine — main entry point.
 *
 * runShortlist(teams, config, registry) → { rankedResults, shortlist, waitlist, rejected, cutoffScore, runMeta }
 *
 * PURE FUNCTION: no network, no file I/O, no side effects.
 * Same data + config = same output every time.
 */
import { applyFilters } from "./applyFilters.js";
import { scoreTeams } from "./scoreTeams.js";
import { rankAndSelect } from "./rankAndSelect.js";
import { attachExplanations } from "./explain.js";

/**
 * @param {object[]} teams   - enriched teams (from server GET /api/imports/:id/enriched)
 * @param {object}   config  - validated Config object
 * @param {object}   registry - metrics registry { metrics: [...] }
 * @returns {{ rankedResults, shortlist, waitlist, rejected, cutoffScore, runMeta }}
 */
export function runShortlist(teams, config, registry = { metrics: [] }) {
  const startedAt = Date.now();

  // 1. Apply hard filters → each team gets filterResults
  const withFilters = applyFilters(teams, config.filters ?? []);

  // 2. Score every team (even filtered-out ones — for counterfactual explanations)
  const withScores = scoreTeams(withFilters, config);

  // 3. Rank, apply overrides, select top X + waitlist
  const { rankedResults, shortlist, waitlist, rejected, cutoffScore } =
    rankAndSelect(withScores, config);

  // 4. Attach human-readable explanations (codes → structured reasons)
  attachExplanations(rankedResults, config, cutoffScore);

  const runMeta = {
    runAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    seed: config.options?.seed ?? 42,
    totalTeams: teams.length,
    topX: config.selection.topX,
    waitlistSize: config.selection.waitlistSize ?? 0,
    enabledCriteria: (config.criteria ?? []).filter((c) => c.enabled).length,
    enabledFilters: (config.filters ?? []).filter((f) => f.enabled).length,
  };

  return { rankedResults, shortlist, waitlist, rejected, cutoffScore, runMeta };
}
