import { Router } from "express";
import { getJob } from "../modules/jobs/jobs.js";
import { httpError } from "../utils/httpError.js";

const router = Router();

router.get("/:id", (req, res, next) => {
  const job = getJob(req.params.id);
  if (!job) {
    return next(
      httpError(
        404,
        "JOB_NOT_FOUND",
        `No job ${req.params.id} (jobs live in memory and clear on restart)`,
      ),
    );
  }
  res.json({ ...job, statusUrl: `/api/jobs/${job.jobId}` });
});

export default router;
