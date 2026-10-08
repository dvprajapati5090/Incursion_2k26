import pLimit from "p-limit";
import { env } from "../../config/env.js";
import {
  setMetric,
  notProvided,
  fetchFailed,
  STATUS,
} from "../metrics/metricValue.js";

export async function enrichTeams(teams, enrichers) {
  const limit = pLimit(env.enrichConcurrency);
  const jobs = [];

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
            }
          }),
        );
      }
    }
  }

  await Promise.all(jobs);
  return { teams, summary: summarize(teams) };
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
