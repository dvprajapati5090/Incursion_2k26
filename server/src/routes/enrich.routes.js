import { Router } from "express";
import { loadImport } from "../modules/import/store.js";
import { enrichTeams } from "../modules/enrich/runner.js";
import { ENRICHERS } from "../modules/enrich/enrichers/index.js";
import { saveEnriched, loadEnriched } from "../modules/enrich/store.js";

const router = Router();

// POST /api/imports/:id/enrich  -> run enrichment, save result, return summary
router.post("/:id/enrich", async (req, res, next) => {
  try {
    const record = await loadImport(req.params.id);
    const teams = structuredClone(record.teams); // never mutate the raw import
    const { summary } = await enrichTeams(teams, ENRICHERS);
    const saved = await saveEnriched(record.importId, {
      enrichers: ENRICHERS.map((e) => e.name),
      summary,
      teams,
    });
    res.json({
      importId: saved.importId,
      enrichedAt: saved.enrichedAt,
      enrichers: saved.enrichers,
      summary,
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/imports/:id/enriched  -> { importId, enrichedAt, summary, teams }
// `teams` is exactly what the engine consumes
router.get("/:id/enriched", async (req, res, next) => {
  try {
    res.json(await loadEnriched(req.params.id));
  } catch (e) {
    next(e);
  }
});

export default router;
