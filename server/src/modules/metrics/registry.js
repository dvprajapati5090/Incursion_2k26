import fs from "node:fs";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(
  new URL("../../contracts/metrics.registry.json", import.meta.url),
);
const registry = JSON.parse(fs.readFileSync(file, "utf8"));

const byId = new Map();
for (const m of registry.metrics) {
  if (byId.has(m.id))
    throw new Error(`Duplicate metric id in registry: ${m.id}`);
  byId.set(m.id, m);
}

export const getRegistry = () => registry;
export const getMetric = (id) => byId.get(id) ?? null;
export const isComputed = (id) => byId.get(id)?.source === "computed";
export const metricsForSource = (source) =>
  registry.metrics.filter((m) => m.source === source);
