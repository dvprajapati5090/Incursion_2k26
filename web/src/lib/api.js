/**
 * API client — thin wrappers around fetch for every server endpoint.
 * Base URL is empty because vite.config.js proxies /api → http://localhost:3000
 */

const BASE = "/api";

async function handleResponse(res) {
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.message || body.error || message;
    } catch {}
    throw new Error(message);
  }
  return res.json();
}

// ---------- Health ----------

export async function getHealth() {
  const res = await fetch(`${BASE}/health`);
  return handleResponse(res);
}

// ---------- Imports ----------

/**
 * Upload a CSV or JSON file.
 * @param {File} file
 * @param {object} [columnMap] - optional column remapping e.g. { team_id: "Team Number" }
 * @returns {{ importId: string, report: object }}
 */
export async function uploadFile(file, columnMap = {}) {
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

// ---------- Enrichment ----------

/**
 * Trigger enrichment for an importId (fetches GitHub, parses resumes, etc.)
 * @param {string} importId
 * @returns {{ importId, enrichedAt, enrichers, summary }}
 */
export async function enrichImport(importId) {
  const res = await fetch(`${BASE}/imports/${importId}/enrich`, {
    method: "POST",
  });
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
