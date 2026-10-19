import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import healthRoutes from "./routes/health.routes.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import importRoutes from "./routes/import.routes.js";
import registryRoutes from "./routes/registry.routes.js";
import jobsRoutes from "./routes/jobs.routes.js";
import enrichRoutes from "./routes/enrich.routes.js";
import engineRoutes from "./routes/engine.routes.js";

const app = express();

const rawCors = env.corsOrigin?.trim();
const corsOrigin =
  !rawCors || rawCors === "*"
    ? true
    : rawCors.includes(",")
    ? rawCors.split(",").map((s) => s.trim())
    : rawCors;

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: "10mb" })); // team data can be large
app.use("/api/jobs", jobsRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/imports", importRoutes);
app.use("/api/registry", registryRoutes);
app.use("/api/imports", enrichRoutes);
app.use("/api/engine", engineRoutes);
app.use("/api/shortlist", engineRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
