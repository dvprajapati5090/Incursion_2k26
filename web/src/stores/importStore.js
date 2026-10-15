/**
 * importStore — holds the imported file state.
 *
 * Flow: idle → uploading → imported → enriching → enriched
 *
 * importId is used as the key for all subsequent API calls.
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
  error: null,

  // Actions
  setUploading: () => set({ phase: "uploading", error: null }),

  setImported: ({ importId, filename, report, teams }) =>
    set({ phase: "imported", importId, filename, report, rawTeams: teams, error: null }),

  setEnriching: () => set({ phase: "enriching", error: null }),

  setEnriched: ({ teams, summary }) =>
    set({ phase: "enriched", enrichedTeams: teams, enrichSummary: summary }),

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
      error: null,
    }),
}));

export default useImportStore;
