import { Router } from "express";
import multer from "multer";
import { importCsv, importJson } from "../modules/import/index.js";
import { saveImport, loadImport } from "../modules/import/store.js";
import { httpError } from "../utils/httpError.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// POST /api/imports  (multipart: file=<csv|json>, optional columnMap=<json string>)
router.post("/", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file)
      throw httpError(400, "NO_FILE", "Upload a file in the 'file' field");

    const name = req.file.originalname.toLowerCase();
    const text = req.file.buffer.toString("utf8");

    let result;
    if (name.endsWith(".csv")) {
      let columnMap = {};
      if (req.body?.columnMap) {
        try {
          columnMap = JSON.parse(req.body.columnMap);
        } catch {
          throw httpError(
            400,
            "BAD_COLUMN_MAP",
            "columnMap must be valid JSON",
          );
        }
      }
      result = importCsv(text, columnMap);
    } else if (name.endsWith(".json")) {
      result = importJson(text);
    } else {
      throw httpError(
        400,
        "UNSUPPORTED_FILE",
        "Only .csv and .json files are supported",
      );
    }

    const saved = await saveImport({
      filename: req.file.originalname,
      ...result,
    });
    res.status(201).json({ importId: saved.importId, report: saved.report });
  } catch (e) {
    next(e);
  }
});

// GET /api/imports/:id  -> full normalized teams + report
router.get("/:id", async (req, res, next) => {
  try {
    res.json(await loadImport(req.params.id));
  } catch (e) {
    next(e);
  }
});

export default router;
