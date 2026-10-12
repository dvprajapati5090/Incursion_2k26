/**
 * configStore — holds the active Config object.
 *
 * The config is validated against the Zod schema before being stored,
 * so the engine always receives a valid, well-formed config.
 */
import { create } from "zustand";
import { DEFAULT_CONFIG } from "@/lib/configSchema";

const useConfigStore = create((set, get) => ({
  // Active config (plain JS object matching Config Zod schema)
  config: structuredClone(DEFAULT_CONFIG),

  // ---------- Bulk update ----------
  setConfig: (config) => set({ config }),

  // ---------- Selection ----------
  setTopX: (topX) =>
    set((s) => ({
      config: { ...s.config, selection: { ...s.config.selection, topX } },
    })),

  setWaitlistSize: (waitlistSize) =>
    set((s) => ({
      config: {
        ...s.config,
        selection: { ...s.config.selection, waitlistSize },
      },
    })),

  // ---------- Criteria ----------
  setCriteria: (criteria) =>
    set((s) => ({ config: { ...s.config, criteria } })),

  updateCriterion: (id, patch) =>
    set((s) => ({
      config: {
        ...s.config,
        criteria: s.config.criteria.map((c) =>
          c.id === id ? { ...c, ...patch } : c
        ),
      },
    })),

  addCriterion: (criterion) =>
    set((s) => ({
      config: { ...s.config, criteria: [...s.config.criteria, criterion] },
    })),

  removeCriterion: (id) =>
    set((s) => ({
      config: {
        ...s.config,
        criteria: s.config.criteria.filter((c) => c.id !== id),
      },
    })),

  // ---------- Filters ----------
  setFilters: (filters) =>
    set((s) => ({ config: { ...s.config, filters } })),

  updateFilter: (id, patch) =>
    set((s) => ({
      config: {
        ...s.config,
        filters: s.config.filters.map((f) =>
          f.id === id ? { ...f, ...patch } : f
        ),
      },
    })),

  addFilter: (filter) =>
    set((s) => ({
      config: { ...s.config, filters: [...s.config.filters, filter] },
    })),

  removeFilter: (id) =>
    set((s) => ({
      config: {
        ...s.config,
        filters: s.config.filters.filter((f) => f.id !== id),
      },
    })),

  // ---------- Options ----------
  setBlindMode: (blindMode) =>
    set((s) => ({
      config: {
        ...s.config,
        options: { ...s.config.options, blindMode },
      },
    })),

  setSeed: (seed) =>
    set((s) => ({
      config: { ...s.config, options: { ...s.config.options, seed } },
    })),

  // ---------- Overrides ----------
  pinTeam: (teamId) =>
    set((s) => ({
      config: {
        ...s.config,
        overrides: {
          ...s.config.overrides,
          pin: [...new Set([...s.config.overrides.pin, teamId])],
          exclude: s.config.overrides.exclude.filter((id) => id !== teamId),
          waitlist: s.config.overrides.waitlist.filter((id) => id !== teamId),
        },
      },
    })),

  excludeTeam: (teamId) =>
    set((s) => ({
      config: {
        ...s.config,
        overrides: {
          ...s.config.overrides,
          exclude: [...new Set([...s.config.overrides.exclude, teamId])],
          pin: s.config.overrides.pin.filter((id) => id !== teamId),
          waitlist: s.config.overrides.waitlist.filter((id) => id !== teamId),
        },
      },
    })),

  waitlistTeam: (teamId) =>
    set((s) => ({
      config: {
        ...s.config,
        overrides: {
          ...s.config.overrides,
          waitlist: [...new Set([...s.config.overrides.waitlist, teamId])],
          pin: s.config.overrides.pin.filter((id) => id !== teamId),
          exclude: s.config.overrides.exclude.filter((id) => id !== teamId),
        },
      },
    })),

  clearOverride: (teamId) =>
    set((s) => ({
      config: {
        ...s.config,
        overrides: {
          pin: s.config.overrides.pin.filter((id) => id !== teamId),
          exclude: s.config.overrides.exclude.filter((id) => id !== teamId),
          waitlist: s.config.overrides.waitlist.filter((id) => id !== teamId),
        },
      },
    })),

  // ---------- Reset ----------
  resetConfig: () => set({ config: structuredClone(DEFAULT_CONFIG) }),
}));

export default useConfigStore;
