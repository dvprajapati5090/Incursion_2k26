/**
 * resultsStore — holds the output from the shortlisting engine.
 */
import { create } from "zustand";

const useResultsStore = create((set) => ({
  // Engine output
  running: false,
  rankedResults: [],  // all teams, sorted by rank
  shortlist: [],      // top X teams
  waitlist: [],       // waitlisted teams
  rejected: [],       // rejected teams
  cutoffScore: null,
  runMeta: null,      // { runAt, seed, totalTeams, ... }
  error: null,

  setRunning: (running) => set({ running }),

  setResults: ({ rankedResults, shortlist, waitlist, rejected, cutoffScore, runMeta }) =>
    set({
      running: false,
      rankedResults,
      shortlist,
      waitlist,
      rejected,
      cutoffScore,
      runMeta,
      error: null,
    }),

  setError: (error) => set({ running: false, error }),

  clearResults: () =>
    set({
      running: false,
      rankedResults: [],
      shortlist: [],
      waitlist: [],
      rejected: [],
      cutoffScore: null,
      runMeta: null,
      error: null,
    }),
}));

export default useResultsStore;
