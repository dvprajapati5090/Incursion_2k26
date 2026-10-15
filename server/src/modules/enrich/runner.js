import pLimit from "p-limit";
import { env } from "../../config/env.js";
import {
  setMetric,
  notProvided,
  fetchFailed,
  STATUS,
} from "../metrics/metricValue.js";
import { REFINERS } from "./refiners/index.js";
import { detectFlags } from "../flags/index.js";

// An LLM value replaces an existing one only if it is more confident; the old value is kept for audit.
function mergeRefined(member, refined) {
  let updated = 0;
  for (const [id, entry] of Object.entries(refined)) {
    const old = member.metrics[id];
    if (entry.confidence > (old?.confidence ?? 0)) {
      if (old) {
        entry.previous = {
          value: old.value,
          status: old.status,
          origin: old.origin,
          confidence: old.confidence ?? null,
        };
      }
      setMetric(member, id, entry);
      updated++;
    }
  }
  return updated;
}

export async function enrichTeams(teams, enrichers, { onProgress } = {}) {
  const report = (phase, done, total) => onProgress?.({ phase, done, total });

  // Pass 1: enrichers (GitHub, resume rules, ...)
  const limit = pLimit(env.enrichConcurrency);
  const jobs = [];
  let done1 = 0;
  let total1 = 0;

  for (const team of teams) {
    for (const member of team.members) {
      for (const enr of enrichers) {
        const hasSource =
          member.sources[enr.source] !== null &&
          member.sources[enr.source] !== undefined;

        if (!hasSource) {
          enr.metricIds.forEach((id) => setMetric(member, id, notProvided()));
          continue;
        }

        jobs.push(
          limit(async () => {
            const t0 = Date.now();
            try {
              const out = await enr.enrich(member);
              for (const id of enr.metricIds) {
                setMetric(
                  member,
                  id,
                  out[id] ??
                    fetchFailed(enr.name, "enricher_returned_no_value"),
                );
              }
            } catch (e) {
              enr.metricIds.forEach((id) =>
                setMetric(member, id, fetchFailed(enr.name, e.message)),
              );
            } finally {
              const ms = Date.now() - t0;
              if (ms > 2000)
                console.log(
                  `[enrich] slow: ${enr.name} ${member.memberId} took ${ms}ms`,
                );
              report("enrich", ++done1, total1);
            }
          }),
        );
      }
    }
  }
  total1 = jobs.length;
  report("enrich", 0, total1);
  await Promise.all(jobs);

  // Pass 2: refiners (LLM) run on top of pass-1 results
  const llm = { attempted: 0, failed: 0, metricsUpdated: 0 };
  const llmLimit = pLimit(env.llm.concurrency);
  const refineJobs = [];
  let done2 = 0;
  let total2 = 0;

  for (const team of teams) {
    for (const member of team.members) {
      for (const ref of REFINERS) {
        if (!ref.shouldRun(member)) continue;
        refineJobs.push(
          llmLimit(async () => {
            llm.attempted++;
            try {
              const refined = await ref.refine(member);
              llm.metricsUpdated += mergeRefined(member, refined); // read-modify-write after the await, so no lost updates
            } catch (e) {
              llm.failed++;
              member.flags.push({
                code: "LLM_REFINE_FAILED",
                severity: "warn",
                detail: `${ref.name}: ${e.message}`,
              });
            } finally {
              report("llm", ++done2, total2);
            }
          }),
        );
      }
    }
  }
  total2 = refineJobs.length;
  report("llm", 0, total2);
  await Promise.all(refineJobs);

  // Pass 3: suspicious-profile flags (fast, deterministic)
  report("flags", 0, 1);
  const flags = detectFlags(teams);
  report("flags", 1, 1);

  return { teams, summary: { ...summarize(teams), llm, flags } };
}

function summarize(teams) {
  const byMetric = {};
  let members = 0;
  for (const team of teams) {
    for (const m of team.members) {
      members++;
      for (const [id, entry] of Object.entries(m.metrics)) {
        byMetric[id] ??= {
          [STATUS.OK]: 0,
          [STATUS.NOT_PROVIDED]: 0,
          [STATUS.FETCH_FAILED]: 0,
          [STATUS.LOW_CONFIDENCE]: 0,
        };
        byMetric[id][entry.status]++;
      }
    }
  }
  return { teams: teams.length, members, byMetric };
}
