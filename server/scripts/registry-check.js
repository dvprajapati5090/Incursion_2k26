import { getRegistry } from "../src/modules/metrics/registry.js";
import { ENRICHERS } from "../src/modules/enrich/enrichers/index.js";
import { REFINERS } from "../src/modules/enrich/refiners/index.js";

const provided = new Set(
  [...ENRICHERS, ...REFINERS].flatMap((e) => e.metricIds),
);
const all = getRegistry().metrics.filter((m) => m.source !== "computed");
const reserved = all.filter((m) => m.reserved);
const needed = all.filter((m) => !m.reserved);
const missing = needed.filter((m) => !provided.has(m.id));

console.log(
  `Registry coverage: ${needed.length - missing.length} of ${needed.length} data-provider metrics implemented`,
);
if (reserved.length)
  console.log(
    `Reserved (deliberately not collected): ${reserved.map((m) => m.id).join(", ")}`,
  );

const bySource = {};
for (const m of missing) (bySource[m.source] ??= []).push(m.id);
for (const [source, ids] of Object.entries(bySource))
  console.log(`\n${source}:\n  ${ids.join("\n  ")}`);
