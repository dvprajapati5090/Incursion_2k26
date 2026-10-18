import { Router } from "express";
import {
  runEngine,
  PRESETS,
  getPreset,
  listPresets,
  compareTeams,
  analyzeSensitivity,
  exportShortlist,
  anonymizeTeams,
} from "../../../engine/src/index.js";
import { getRegistry } from "../modules/metrics/registry.js";
import { loadEnriched } from "../modules/enrich/store.js";
import { loadImport } from "../modules/import/store.js";
import { httpError } from "../utils/httpError.js";

const router = Router();

// Helper to resolve teams from body or storage
async function resolveTeams(req) {
  if (Array.isArray(req.body?.teams) && req.body.teams.length > 0) {
    return req.body.teams;
  }

  const importId = req.body?.importId || req.params?.id || req.query?.importId;
  if (importId) {
    try {
      const enriched = await loadEnriched(importId);
      return enriched.teams;
    } catch {
      // If not enriched yet, fall back to normalized raw teams
      const raw = await loadImport(importId);
      return raw.teams;
    }
  }

  throw httpError(400, "MISSING_TEAMS", "Provide 'teams' array or valid 'importId'");
}

// POST /api/engine/run (or /api/shortlist) -> Run full shortlisting engine
router.post("/run", async (req, res, next) => {
  try {
    const teams = await resolveTeams(req);
    const config = req.body?.config;
    if (!config || typeof config !== "object") {
      throw httpError(400, "MISSING_CONFIG", "Provide a valid 'config' object");
    }

    const registry = req.body?.registry || getRegistry();
    const result = runEngine(teams, config, registry);

    // Calculate cutoff score for easy frontend access
    const cutoffScore =
      result.shortlist?.length > 0
        ? result.shortlist[result.shortlist.length - 1]?.score ?? null
        : null;

    res.json({
      ...result,
      cutoffScore,
    });
  } catch (e) {
    next(e);
  }
});

// Root post on /api/shortlist alias
router.post("/", async (req, res, next) => {
  try {
    const teams = await resolveTeams(req);
    const config = req.body?.config;
    if (!config || typeof config !== "object") {
      throw httpError(400, "MISSING_CONFIG", "Provide a valid 'config' object");
    }

    const registry = req.body?.registry || getRegistry();
    const result = runEngine(teams, config, registry);
    const cutoffScore =
      result.shortlist?.length > 0
        ? result.shortlist[result.shortlist.length - 1]?.score ?? null
        : null;

    res.json({
      ...result,
      cutoffScore,
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/engine/presets -> List available strategy presets
router.get("/presets", (req, res) => {
  res.json({
    list: listPresets(),
    presets: PRESETS,
  });
});

// GET /api/engine/presets/:id -> Get specific preset
router.get("/presets/:id", (req, res, next) => {
  try {
    const topX = req.query.topX ? Number(req.query.topX) : null;
    const preset = getPreset(req.params.id, topX);
    res.json(preset);
  } catch (e) {
    next(httpError(404, "PRESET_NOT_FOUND", e.message));
  }
});

// POST /api/engine/compare -> Head-to-head pairwise comparison between 2 teams
router.post("/compare", (req, res, next) => {
  try {
    const { teamA, teamB } = req.body || {};
    if (!teamA || !teamB) {
      throw httpError(400, "MISSING_TEAMS", "Provide both 'teamA' and 'teamB' objects");
    }
    const comparison = compareTeams(teamA, teamB);
    res.json(comparison);
  } catch (e) {
    next(e);
  }
});

// POST /api/engine/sensitivity -> Analyze shortlist stability under weight perturbations
router.post("/sensitivity", async (req, res, next) => {
  try {
    const teams = await resolveTeams(req);
    const { config, options } = req.body || {};
    if (!config) {
      throw httpError(400, "MISSING_CONFIG", "Provide 'config' object");
    }
    const report = analyzeSensitivity(teams, config, options || {});
    res.json(report);
  } catch (e) {
    next(e);
  }
});

// POST /api/engine/export -> Export results as standardized JSON or CSV
router.post("/export", (req, res, next) => {
  try {
    const { result, config, format = "json" } = req.body || {};
    if (!result || !config) {
      throw httpError(400, "INVALID_EXPORT_REQUEST", "Provide 'result' and 'config'");
    }
    const exported = exportShortlist(result, config, format);
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="shortlist.csv"');
      return res.send(exported);
    }
    res.setHeader("Content-Type", "application/json");
    res.send(exported);
  } catch (e) {
    next(e);
  }
});

// POST /api/engine/anonymize -> Blind evaluation mask
router.post("/anonymize", async (req, res, next) => {
  try {
    const teams = await resolveTeams(req);
    const anonymized = anonymizeTeams(teams);
    res.json(anonymized);
  } catch (e) {
    next(e);
  }
});

export default router;
