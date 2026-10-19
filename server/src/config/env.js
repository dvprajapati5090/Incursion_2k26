import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

export const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || "development",
  portfolioCacheTtlHours: Number(process.env.PORTFOLIO_CACHE_TTL_HOURS) || 24,
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  githubToken: process.env.GITHUB_TOKEN?.trim() || null,
  githubCacheTtlHours: Number(process.env.GITHUB_CACHE_TTL_HOURS) || 24,
  resumeCacheTtlHours: Number(process.env.RESUME_CACHE_TTL_HOURS) || 168,
  enrichConcurrency: Number(process.env.ENRICH_CONCURRENCY) || 4,
  llm: {
    provider:
      process.env.LLM_PROVIDER ||
      (process.env.GEMINI_API_KEY ? "gemini" : "none"), // gemini | ollama | none
    mode: process.env.LLM_MODE || "auto", // auto | all | off
    geminiKey: process.env.GEMINI_API_KEY || null,
    geminiModel: process.env.GEMINI_MODEL || "gemini-flash-latest",
    ollamaUrl: process.env.OLLAMA_URL || "http://localhost:11434",
    ollamaModel: process.env.OLLAMA_MODEL || "llama3.1:8b",
    minIntervalMs: Number(process.env.LLM_MIN_INTERVAL_MS) || 4000,
    concurrency: Number(process.env.LLM_CONCURRENCY) || 2,
    cacheTtlHours: Number(process.env.LLM_CACHE_TTL_HOURS) || 168,
  },
};
