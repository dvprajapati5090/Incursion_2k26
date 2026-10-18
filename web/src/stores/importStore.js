/**
 * importStore — holds the imported and enriched file state.
 *
 * Flow: idle → uploading → imported → enriching → enriched
 *
 * importId is used as the key for all subsequent API calls.
 * asOf: reference timestamp used for "Present" date calculations and GitHub ages.
 * enrichers: array of active enrichers (e.g. ["github", "resume", ...] or ["mock_github", ...])
 * isMockGithub: true when server operates without GitHub token (origin: "mock")
 */
import { create } from "zustand";

const useImportStore = create((set) => ({
  // State
  phase: "idle", // "idle" | "uploading" | "imported" | "enriching" | "enriched"
  importId: null,
  filename: null,
  report: null,       // import report from server
  rawTeams: [],       // normalized teams (no metrics yet)
  enrichedTeams: [],  // teams with metrics, ready for engine
  enrichSummary: null,
  asOf: null,
  enrichedAt: null,
  enrichers: [],
  isMockGithub: false,
  enrichJob: null,    // { jobId, phase, progress: { done, total }, status, ... }
  error: null,

  // Actions
  setUploading: () => set({ phase: "uploading", error: null }),

  setImported: ({ importId, filename, report, teams }) =>
    set({
      phase: "imported",
      importId,
      filename,
      report,
      rawTeams: teams || [],
      error: null,
    }),

  setEnriching: (job = null) =>
    set({ phase: "enriching", enrichJob: job, error: null }),

  setEnrichJob: (job) => set({ enrichJob: job }),

  setEnriched: ({ teams, summary, asOf = null, enrichedAt = null, enrichers = [] }) => {
    const isMock = Array.isArray(enrichers) && enrichers.includes("mock_github");
    set({
      phase: "enriched",
      enrichedTeams: teams || [],
      enrichSummary: summary || null,
      asOf,
      enrichedAt,
      enrichers: enrichers || [],
      isMockGithub: isMock,
      error: null,
    });
  },

  setError: (error) => set({ phase: "idle", error }),

  reset: () =>
    set({
      phase: "idle",
      importId: null,
      filename: null,
      report: null,
      rawTeams: [],
      enrichedTeams: [],
      enrichSummary: null,
      asOf: null,
      enrichedAt: null,
      enrichers: [],
      isMockGithub: false,
      enrichJob: null,
      error: null,
    }),
}));

export default useImportStore;
