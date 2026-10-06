import { Router } from "express";
import { getRegistry } from "../modules/metrics/registry.js";

const router = Router();
router.get("/", (req, res) => res.json(getRegistry()));
export default router;
