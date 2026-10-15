/**
 * Web Worker wrapper for the shortlisting engine.
 * Runs runShortlist in a background thread so the UI stays responsive
 * during live re-ranking (weight changes trigger instant re-runs).
 *
 * Message IN:  { type: "RUN", teams, config, registry }
 * Message OUT: { type: "RESULT", payload } | { type: "ERROR", message }
 */
import { runShortlist } from "./runShortlist.js";

self.onmessage = (event) => {
  const { type, teams, config, registry } = event.data;

  if (type !== "RUN") return;

  try {
    const result = runShortlist(teams, config, registry);
    self.postMessage({ type: "RESULT", payload: result });
  } catch (err) {
    self.postMessage({ type: "ERROR", message: err.message });
  }
};
