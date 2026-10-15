import { randomUUID } from "node:crypto";
import { runEnrichment } from "../enrich/pipeline.js";

const jobs = new Map();
const KEEP_FINISHED_MS = 60 * 60 * 1000;

function prune() {
  const now = Date.now();
  for (const [id, j] of jobs) {
    if (j.finishedAt && now - Date.parse(j.finishedAt) > KEEP_FINISHED_MS)
      jobs.delete(id);
  }
}

export function createJob(importId) {
  prune();
  const job = {
    jobId: `job_${randomUUID().slice(0, 8)}`,
    importId,
    status: "queued", // queued | running | done | failed
    phase: null, // enrich | llm | flags | saving
    progress: { done: 0, total: 0 },
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    enrichedAt: null,
    summary: null,
    error: null,
  };
  jobs.set(job.jobId, job);
  return job;
}

export const getJob = (id) => jobs.get(id) ?? null;

export function findActiveJob(importId) {
  for (const j of jobs.values()) {
    if (
      j.importId === importId &&
      (j.status === "queued" || j.status === "running")
    )
      return j;
  }
  return null;
}

// Fire and forget: the HTTP request has already returned by the time this finishes.
export function runJob(job, record) {
  job.status = "running";
  job.startedAt = new Date().toISOString();

  runEnrichment(record, (p) => {
    job.phase = p.phase;
    job.progress = { done: p.done, total: p.total };
  })
    .then((result) => {
      job.status = "done";
      job.summary = result.summary;
      job.enrichedAt = result.enrichedAt;
    })
    .catch((e) => {
      console.error(`[job ${job.jobId}] failed`, e);
      job.status = "failed";
      job.error = { code: e.code ?? "ENRICH_FAILED", message: e.message };
    })
    .finally(() => {
      job.finishedAt = new Date().toISOString();
    });
}
