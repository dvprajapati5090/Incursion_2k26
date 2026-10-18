import { env } from "../../../config/env.js";
import mockGithub from "./mockGithub.js";
import github from "./github/index.js";
import resume from "./resume/index.js";
import linkedin from "./linkedin/index.js";
import portfolio from "./portfolio/index.js";

export const ENRICHERS = [
  env.githubToken ? github : mockGithub,
  resume,
  linkedin,
  portfolio,
];
console.log(`[enrich] enrichers: ${ENRICHERS.map((e) => e.name).join(", ")}`);
