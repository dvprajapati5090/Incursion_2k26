import { ok } from "../../../metrics/metricValue.js";
import { splitSections, BULLET } from "./sections.js";

export const METRIC_IDS = [
  "resume.text",
  "resume.skills",
  "resume.project_count",
  "resume.achievement_count",
  "resume.certification_count",
  "resume.internship_count",
  "resume.publication_count",
  "resume.education_level",
];

const TEXT_CAP = 20_000;
const NOT_FOUND = 0.3; // section missing -> value 0 but flagged low_confidence

// Entries with a title line followed by bullets (projects, jobs): count bullet blocks.
function countEntries(lines) {
  if (!lines) return { value: 0, confidence: NOT_FOUND };

  let blocks = 0;
  let prevBullet = false;
  let anyBullet = false;
  for (const l of lines) {
    if (!l) continue;
    const b = BULLET.test(l);
    if (b) {
      anyBullet = true;
      if (!prevBullet) blocks++;
    }
    prevBullet = b;
  }
  if (anyBullet) return { value: blocks, confidence: 0.7 };

  // No bullets: fall back to blank-line separated paragraphs
  const paragraphs = lines
    .join("\n")
    .split(/\n{2,}|\n\s*\n/)
    .filter((p) => p.trim()).length;
  return { value: paragraphs, confidence: paragraphs ? 0.55 : NOT_FOUND };
}

// One item per bullet (awards, certificates, papers); else one per non-empty line.
function countItems(lines) {
  if (!lines) return { value: 0, confidence: NOT_FOUND };
  const bullets = lines.filter((l) => BULLET.test(l)).length;
  if (bullets) return { value: bullets, confidence: 0.75 };
  const nonEmpty = lines.filter(Boolean).length;
  return { value: nonEmpty, confidence: nonEmpty ? 0.55 : NOT_FOUND };
}

function parseSkills(lines) {
  if (!lines) return { value: [], confidence: NOT_FOUND };

  const seen = new Set();
  const out = [];
  for (let line of lines) {
    if (!line) continue;
    line = line.replace(BULLET, "");
    const colon = line.indexOf(":");
    if (colon !== -1 && colon < 40) line = line.slice(colon + 1); // drop "Languages:" label
    for (const part of line.split(/[,;|•●▪·]+/)) {
      const skill = part.trim().replace(/\.$/, "");
      if (skill.length < 1 || skill.length > 40 || /^\d+$/.test(skill))
        continue;
      const key = skill.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(skill);
    }
  }
  const value = out.slice(0, 80);
  return { value, confidence: value.length ? 0.8 : NOT_FOUND };
}

const LEVELS = [
  [5, /\b(?:ph\.?\s?d|doctorate|doctor of philosophy)\b/i],
  [4, /\b(?:master'?s?|m\.?\s?tech|m\.?\s?sc|mba|mca|m\.e)\b/i],
  [
    3,
    /\b(?:bachelor'?s?|b\.?\s?tech|b\.?\s?sc|bca|bba|b\.?\s?com|b\.e|undergraduate)\b/i,
  ],
  [2, /\b(?:diploma|polytechnic|associate'?s? degree)\b/i],
  [
    1,
    /\b(?:higher secondary|hsc|ssc|12th|10th|class (?:x|xii|10|12)|senior secondary|high school|secondary school)\b/i,
  ],
];

// 0 none, 1 school, 2 diploma, 3 bachelors, 4 masters, 5 doctorate (highest match wins)
function educationLevel(eduLines, fullText) {
  const haystack = eduLines ? eduLines.join("\n") : fullText;
  let level = 0;
  for (const [lvl, re] of LEVELS) {
    if (re.test(haystack)) {
      level = lvl;
      break; // LEVELS is ordered highest first
    }
  }
  if (level > 0) return { value: level, confidence: eduLines ? 0.8 : 0.5 };
  return { value: 0, confidence: eduLines ? 0.4 : NOT_FOUND };
}

export function parseResume(text) {
  const s = splitSections(text);
  return {
    skills: parseSkills(s.skills),
    projects: countEntries(s.projects),
    internships: countEntries(s.experience),
    achievements: countItems(s.achievements),
    certifications: countItems(s.certifications),
    publications: countItems(s.publications),
    education: educationLevel(s.education, text),
  };
}

export function toMetrics(text, origin) {
  const p = parseResume(text);
  const o = { origin: "rule_based" };
  return {
    "resume.text": ok("resume.text", text.slice(0, TEXT_CAP), { origin }),
    "resume.skills": ok("resume.skills", p.skills.value, {
      ...o,
      confidence: p.skills.confidence,
    }),
    "resume.project_count": ok("resume.project_count", p.projects.value, {
      ...o,
      confidence: p.projects.confidence,
    }),
    "resume.internship_count": ok(
      "resume.internship_count",
      p.internships.value,
      { ...o, confidence: p.internships.confidence },
    ),
    "resume.achievement_count": ok(
      "resume.achievement_count",
      p.achievements.value,
      { ...o, confidence: p.achievements.confidence },
    ),
    "resume.certification_count": ok(
      "resume.certification_count",
      p.certifications.value,
      { ...o, confidence: p.certifications.confidence },
    ),
    "resume.publication_count": ok(
      "resume.publication_count",
      p.publications.value,
      { ...o, confidence: p.publications.confidence },
    ),
    "resume.education_level": ok("resume.education_level", p.education.value, {
      ...o,
      confidence: p.education.confidence,
    }),
  };
}
