import { ok } from "../../../metrics/metricValue.js";
import { splitSections } from "../resume/sections.js";

export const METRIC_IDS = [
  "linkedin.text",
  "linkedin.experience_count",
  "linkedin.certification_count",
  "linkedin.endorsement_count",
  "linkedin.skills",
];

const TEXT_CAP = 20_000;
const NOT_FOUND = 0.3; // nothing recognisable -> value 0 but flagged low_confidence

const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?";
// "June 2025 - August 2025", "Jan 2024 - Present", "2022 - 2026"
const RANGE = new RegExp(
  `(?:${MONTH}\\s+)?(?:19|20)\\d{2}\\s*(?:-|–|—|to)\\s*(?:present|current|(?:${MONTH}\\s+)?(?:19|20)\\d{2})`,
  "i",
);

// One role = one date range line inside the Experience section.
function experienceCount(lines) {
  if (!lines) return { value: 0, confidence: NOT_FOUND };
  const n = lines.filter((l) => RANGE.test(l)).length;
  return n ? { value: n, confidence: 0.8 } : { value: 0, confidence: 0.4 };
}

// Web copies list "Issued <date>" per certificate; PDF exports list bare names (less certain).
function certificationCount(lines) {
  if (!lines) return { value: 0, confidence: NOT_FOUND };
  const issued = lines.filter((l) => /^issued\b/i.test(l.trim())).length;
  if (issued) return { value: issued, confidence: 0.8 };
  const n = lines.filter((l) => l.trim()).length;
  return n ? { value: n, confidence: 0.55 } : { value: 0, confidence: 0.4 };
}

function parseSkills(lines) {
  if (!lines) return { value: [], confidence: NOT_FOUND };
  const seen = new Set();
  const out = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || /endorse|show all|^see |^\d+$/i.test(line)) continue; // web-copy noise
    for (const part of line.split(/[,;|·•]+/)) {
      const skill = part.trim();
      const key = skill.toLowerCase();
      if (!skill || skill.length > 40 || seen.has(key)) continue;
      seen.add(key);
      out.push(skill);
    }
  }
  const value = out.slice(0, 80);
  return { value, confidence: value.length ? 0.8 : NOT_FOUND };
}

// Only present in web copies ("12 endorsements"); PDF exports don't include counts.
function endorsementCount(text) {
  let total = 0;
  let found = false;
  for (const m of text.matchAll(/(\d+)\s+endorsements?/gi)) {
    total += Number(m[1]);
    found = true;
  }
  return found
    ? { value: total, confidence: 0.7 }
    : { value: 0, confidence: NOT_FOUND };
}

export function toMetrics(text, origin) {
  const s = splitSections(text);
  const o = { origin: "rule_based" };
  const exp = experienceCount(s.experience);
  const certs = certificationCount(s.certifications);
  const skills = parseSkills(s.skills);
  const endorse = endorsementCount(text);

  return {
    "linkedin.text": ok("linkedin.text", text.slice(0, TEXT_CAP), { origin }),
    "linkedin.experience_count": ok("linkedin.experience_count", exp.value, {
      ...o,
      confidence: exp.confidence,
    }),
    "linkedin.certification_count": ok(
      "linkedin.certification_count",
      certs.value,
      { ...o, confidence: certs.confidence },
    ),
    "linkedin.endorsement_count": ok(
      "linkedin.endorsement_count",
      endorse.value,
      { ...o, confidence: endorse.confidence },
    ),
    "linkedin.skills": ok("linkedin.skills", skills.value, {
      ...o,
      confidence: skills.confidence,
    }),
  };
}
