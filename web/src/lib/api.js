/**
 * API client — thin wrappers around fetch for every server endpoint.
 * Vite proxies same-origin /api requests in development. Production builds can
 * set VITE_API_URL to the backend origin (without a trailing slash).
 */

const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const BASE = `${API_ORIGIN}/api`;

async function handleResponse(res) {
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    let code = `HTTP_${res.status}`;
    let details = null;
    try {
      const body = await res.json();
      if (body.error) {
        message = body.error.message || message;
        code = body.error.code || code;
        details = body.error.details || null;
      } else if (body.message) {
        message = body.message;
      }
    } catch {}
    const err = new Error(message);
    err.status = res.status;
    err.code = code;
    err.details = details;
    throw err;
  }
  return res.json();
}

// ---------- Health ----------

export async function getHealth() {
  const res = await fetch(`${BASE}/health`);
  return handleResponse(res);
}

// ---------- Imports ----------

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB per Section 2 & 10

/**
 * Upload a CSV or JSON file.
 * @param {File} file
 * @param {object} [columnMap] - optional column remapping e.g. { team_id: "Team Number" }
 * @returns {{ importId: string, report: object }}
 */
export async function uploadFile(file, columnMap = {}) {
  if (file && file.size > MAX_FILE_SIZE) {
    const err = new Error("File exceeds maximum allowed size of 20 MB.");
    err.code = "LIMIT_FILE_SIZE";
    err.status = 413;
    throw err;
  }

  const form = new FormData();
  form.append("file", file);
  if (Object.keys(columnMap).length > 0) {
    form.append("columnMap", JSON.stringify(columnMap));
  }
  const res = await fetch(`${BASE}/imports`, { method: "POST", body: form });
  return handleResponse(res);
}

/**
 * Load the normalized teams + import report for a given importId.
 * @param {string} importId
 * @returns {{ importId, type, teams, report }}
 */
export async function getImport(importId) {
  const res = await fetch(`${BASE}/imports/${importId}`);
  return handleResponse(res);
}

// ---------- Enrichment & Jobs ----------

/**
 * Trigger enrichment for an importId (fetches GitHub, parses resumes, etc.)
 * Returns 202 job object.
 * @param {string} importId
 * @returns {Promise<object>}
 */
export async function enrichImport(importId) {
  const res = await fetch(`${BASE}/imports/${importId}/enrich`, {
    method: "POST",
  });
  return handleResponse(res);
}

/**
 * Poll job progress and status.
 * @param {string} jobId
 * @returns {Promise<{ jobId, importId, status, phase, progress, summary, error, statusUrl }>}
 */
export async function getJob(jobId) {
  const res = await fetch(`${BASE}/jobs/${jobId}`);
  return handleResponse(res);
}

/**
 * Get enriched teams (engine-ready data) for a given importId.
 * @param {string} importId
 * @returns {{ importId, enrichedAt, summary, teams }}
 */
export async function getEnriched(importId) {
  const res = await fetch(`${BASE}/imports/${importId}/enriched`);
  return handleResponse(res);
}

// ---------- Registry ----------

/**
 * Get the metrics registry (list of all available metric ids).
 * @returns {{ metrics: Array, rawFields: string }}
 */
export async function getRegistry() {
  const res = await fetch(`${BASE}/registry`);
  return handleResponse(res);
}

// ---------- Engine / Shortlist Endpoints ----------

/**
 * Run engine through backend
 * @param {{ importId?: string, teams?: Array, config: object, registry?: object }} payload
 */
export async function runShortlistApi(payload) {
  const res = await fetch(`${BASE}/engine/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

/**
 * Fetch strategy presets from engine
 */
export async function getPresetsApi() {
  const res = await fetch(`${BASE}/engine/presets`);
  return handleResponse(res);
}

/**
 * Compare two teams head-to-head
 */
export async function compareTeamsApi(teamA, teamB) {
  const res = await fetch(`${BASE}/engine/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamA, teamB }),
  });
  return handleResponse(res);
}

/**
 * Run sensitivity analysis on weights
 */
export async function analyzeSensitivityApi(payload) {
  const res = await fetch(`${BASE}/engine/sensitivity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

/**
 * Anonymize team profiles for blind evaluation
 */
export async function anonymizeTeamsApi(teams) {
  const res = await fetch(`${BASE}/engine/anonymize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teams }),
  });
  return handleResponse(res);
}
