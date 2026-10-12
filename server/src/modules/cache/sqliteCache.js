import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

const dir = path.resolve("data");
mkdirSync(dir, { recursive: true });

const db = new DatabaseSync(path.join(dir, "cache.sqlite"));
db.exec(`
  CREATE TABLE IF NOT EXISTS cache (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

const getStmt = db.prepare("SELECT value, created_at FROM cache WHERE key = ?");
const setStmt = db.prepare(
  "INSERT OR REPLACE INTO cache (key, value, created_at) VALUES (?, ?, ?)",
);

export function cacheGet(key, ttlMs) {
  const row = getStmt.get(key);
  if (!row) return null;
  if (Date.now() - row.created_at > ttlMs) return null;
  return JSON.parse(row.value);
}

export function cacheSet(key, value) {
  setStmt.run(key, JSON.stringify(value), Date.now());
}
