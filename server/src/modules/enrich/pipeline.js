import { enrichTeams } from "./runner.js";
import { ENRICHERS } from "./enrichers/index.js";
import { saveEnriched } from "./store.js";

export async function runEnrichment(record, onProgress) {
  const teams = structuredClone(record.teams); // never mutate the raw import
  const { summary, asOf } = await enrichTeams(teams, ENRICHERS, { onProgress });

  onProgress?.({ phase: "saving", done: 0, total: 1 });
  const saved = await saveEnriched(record.importId, {
    enrichers: ENRICHERS.map((e) => e.name),
    summary,
    teams,
    asOf: new Date(asOf).toISOString(),
  });
  onProgress?.({ phase: "saving", done: 1, total: 1 });

  return {
    importId: record.importId,
    enrichedAt: saved.enrichedAt,
    asOf: saved.asOf,
    enrichers: saved.enrichers,
    summary,
  };
}
