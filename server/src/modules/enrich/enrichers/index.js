import { env } from "../../../config/env.js";
import mockGithub from "./mockGithub.js";
import github from "./github/index.js";

export const ENRICHERS = [env.githubToken ? github : mockGithub];

console.log(`[enrich] GitHub enricher: ${ENRICHERS[0].name}`);
