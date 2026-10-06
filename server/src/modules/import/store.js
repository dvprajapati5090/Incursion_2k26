import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { httpError } from "../../utils/httpError.js";

const DIR = path.resolve("data", "imports"); // relative to where you run npm (server/)

export async function saveImport({ filename, type, teams, report }) {
  await fs.mkdir(DIR, { recursive: true });
  const importId = `imp_${randomUUID().slice(0, 8)}`;
  const record = {
    importId,
    createdAt: new Date().toISOString(),
    filename,
    type,
    report,
    teams,
  };
  await fs.writeFile(
    path.join(DIR, `${importId}.json`),
    JSON.stringify(record, null, 2),
  );
  return record;
}

export async function loadImport(importId) {
  if (!/^imp_[a-f0-9]{8}$/.test(importId)) {
    throw httpError(400, "BAD_IMPORT_ID", "Invalid import id");
  }
  try {
    const text = await fs.readFile(path.join(DIR, `${importId}.json`), "utf8");
    return JSON.parse(text);
  } catch (e) {
    if (e.code === "ENOENT")
      throw httpError(404, "IMPORT_NOT_FOUND", `No import ${importId}`);
    throw e;
  }
}
