import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "enrichment-server",
    uptimeSeconds: Math.round(process.uptime()),
    time: new Date().toISOString(),
  });
});

export default router;
