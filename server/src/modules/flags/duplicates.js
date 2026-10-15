import { githubLogin } from "../enrich/enrichers/github/parseUrl.js";
import { THRESHOLDS as T } from "./thresholds.js";

function normalizeUrl(source, url) {
  if (!url) return null;
  if (source === "github") {
    const login = githubLogin(url);
    return login ? login.toLowerCase() : null; // github.com/Foo and github.com/foo/repo are the same person
  }
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const path = u.pathname.replace(/\/+$/, "").toLowerCase();
    const id = u.searchParams.get("id"); // Drive "open?id=..." links
    return `${host}${path}${id ? `?id=${id}` : ""}`;
  } catch {
    return null;
  }
}

const idList = (list) => {
  const ids = list.map((x) => x.member.memberId);
  return ids.length > 5
    ? `${ids.slice(0, 5).join(", ")} and ${ids.length - 5} more`
    : ids.join(", ");
};

export function flagDuplicateUrls(entries) {
  for (const source of ["github", "linkedin", "portfolio", "resume"]) {
    const groups = new Map();
    for (const e of entries) {
      const key = normalizeUrl(source, e.member.sources[source]?.url);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(e);
    }
    for (const [key, list] of groups) {
      if (list.length < 2) continue;
      for (const e of list) {
        const others = list.filter((x) => x !== e);
        e.member.flags.push({
          code: "DUPLICATE_SOURCE_URL",
          severity: "warn",
          detail: `Same ${source} link (${key}) also used by ${idList(others)}`,
          related: others.map((o) => o.member.memberId),
        });
      }
    }
  }
}

// ---------- resume text similarity ----------

function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shingles(text) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const set = new Set();
  for (let i = 0; i + T.shingleSize <= words.length; i++) {
    set.add(hash32(words.slice(i, i + T.shingleSize).join(" ")));
  }
  return set;
}

export function flagSimilarResumes(entries) {
  const docs = [];
  for (const e of entries) {
    const t = e.member.metrics["resume.text"];
    if (t?.status !== "ok" || t.value.length < T.resumeMinChars) continue;
    docs.push({ e, set: shingles(t.value) });
  }
  const N = docs.length;
  if (N < 2) return;

  // inverted index: shingle -> docs containing it
  const postings = new Map();
  docs.forEach((d, i) => {
    for (const h of d.set) {
      let p = postings.get(h);
      if (!p) postings.set(h, (p = []));
      p.push(i);
    }
  });

  // count shared shingles per pair (only phrases that are not boilerplate)
  const shared = new Map();
  for (const p of postings.values()) {
    if (p.length < 2 || p.length > T.maxShinglePostings) continue;
    for (let a = 0; a < p.length; a++) {
      for (let b = a + 1; b < p.length; b++) {
        const k = p[a] * N + p[b];
        shared.set(k, (shared.get(k) || 0) + 1);
      }
    }
  }

  for (const [k, count] of shared) {
    const i = Math.floor(k / N);
    const j = k % N;
    const sim = count / (docs[i].set.size + docs[j].set.size - count);
    if (sim < T.resumeSimilarity) continue;

    for (const [x, y] of [
      [i, j],
      [j, i],
    ]) {
      const me = docs[x].e;
      const other = docs[y].e;
      me.member.flags.push({
        code: "SIMILAR_RESUME_TEXT",
        severity: "warn",
        detail: `Resume text is ${Math.round(sim * 100)}% similar to ${other.member.memberId}${other.teamId === me.teamId ? " (same team)" : ""}`,
        related: [other.member.memberId],
      });
    }
  }
}
