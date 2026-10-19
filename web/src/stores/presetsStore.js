/**
 * presetsStore — saved config presets and audit log.
 *
 * Presets are persisted to localStorage so they survive page reloads.
 * The audit log tracks every significant action (weight change, filter toggle, run, export).
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

const usePresetsStore = create(
  persist(
    (set, get) => ({
      // ---------- Presets ----------
      presets: [], // [{ id, name, description, savedAt, config }]

      savePreset: (config) => {
        const preset = {
          id: `preset-${Date.now()}`,
          name: config.name || `Preset ${Date.now()}`,
          description: config.description || "",
          savedAt: new Date().toISOString(),
          config: structuredClone(config),
        };
        set((s) => ({ presets: [preset, ...s.presets] }));
        return preset.id;
      },

      deletePreset: (id) =>
        set((s) => ({ presets: s.presets.filter((p) => p.id !== id) })),

      getPreset: (id) => get().presets.find((p) => p.id === id),

      // ---------- Audit log ----------
      auditLog: [], // [{ id, action, detail, timestamp }]

      logAction: (action, detail = {}) => {
        const entry = {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          action,
          detail,
          timestamp: new Date().toISOString(),
        };
        set((s) => ({ auditLog: [entry, ...s.auditLog].slice(0, 500) }));
      },

      clearLog: () => set({ auditLog: [] }),
    }),
    {
      name: "teamlens-presets", // localStorage key
      partialize: (s) => ({ presets: s.presets, auditLog: s.auditLog }),
    }
  )
);

export default usePresetsStore;
