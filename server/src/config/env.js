import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  githubToken: process.env.GITHUB_TOKEN || null,
  githubCacheTtlHours: Number(process.env.GITHUB_CACHE_TTL_HOURS) || 24,
  enrichConcurrency: Number(process.env.ENRICH_CONCURRENCY) || 4,
};
