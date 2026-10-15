import { Router } from "express";
import { loadImport } from "../modules/import/store.js";
import { loadEnriched } from "../modules/enrich/store.js";
import { runEnrichment } from "../modules/enrich/pipeline.js";
import { createJob, findActiveJob, runJob } from "../modules/jobs/jobs.js";

const router = Router();

const view = (job) => ({ ...job, statusUrl: `/api/jobs/${job.jobId}` });

// POST /api/imports/:id/enrich          -> 202 + job (poll /api/jobs/:jobId)
// POST /api/imports/:id/enrich?wait=true -> blocks, returns the summary (for scripts/tests)
router.post("/:id/enrich", async (req, res, next) => {
  try {
    const record = await loadImport(req.params.id); // 404s immediately for unknown ids

    if (req.query.wait === "true") {
      return res.json(await runEnrichment(record));
    }

    const active = findActiveJob(record.importId);
    if (active) return res.status(202).json(view(active)); // already running: same job

    const job = createJob(record.importId);
    runJob(job, record);
    res.status(202).json(view(job));
  } catch (e) {
    next(e);
  }
});

// GET /api/imports/:id/enriched -> { importId, enrichedAt, summary, teams }
router.get("/:id/enriched", async (req, res, next) => {
  try {
    res.json(await loadEnriched(req.params.id));
  } catch (e) {
    next(e);
  }
});

export default router;
