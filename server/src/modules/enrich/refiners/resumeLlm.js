import { z } from "zod";
import { env } from "../../../config/env.js";
import { ok } from "../../metrics/metricValue.js";
import {
  extractStructured,
  llmEnabled,
  llmModelName,
} from "../../llm/index.js";
import { redactPii } from "../../llm/redact.js";

const PROMPT_VERSION = "resume-v1";
const TEXT_CAP = 20_000;
const BASE = 0.85; // every item verified against the resume text
const NONE_FOUND = 0.7; // model found nothing (it may have missed something, so not higher)

export const METRIC_IDS = [
  "resume.skills",
  "resume.project_count",
  "resume.achievement_count",
  "resume.certification_count",
  "resume.internship_count",
  "resume.publication_count",
  "resume.education_level",
];

const Item = z.object({ name: z.string().min(1), quote: z.string().min(1) });
const Schema = z.object({
  projects: z.array(Item),
  achievements: z.array(Item),
  certifications: z.array(Item),
  publications: z.array(Item),
  experience: z.array(Item.extend({ is_internship: z.boolean() })),
  skills: z.array(z.string()),
  education: z.object({
    level: z.enum([
      "none",
      "school",
      "diploma",
      "bachelors",
      "masters",
      "doctorate",
    ]),
    quote: z.string().nullable(),
  }),
});

const SYSTEM = `You extract facts from a resume for a hackathon team-shortlisting tool.
Use ONLY information that is explicitly present in the resume text. Never infer, guess or invent.
If something is absent, return an empty list. For EVERY item include "quote": a short snippet (max 100 characters)
copied EXACTLY, character for character, from the resume, which proves the item exists.

Return ONLY a JSON object with exactly these keys:
{
  "projects": [{"name": string, "quote": string}],
  "achievements": [{"name": string, "quote": string}],
  "certifications": [{"name": string, "quote": string}],
  "publications": [{"name": string, "quote": string}],
  "experience": [{"name": string, "quote": string, "is_internship": boolean}],
  "skills": [string],
  "education": {"level": "none"|"school"|"diploma"|"bachelors"|"masters"|"doctorate", "quote": string|null}
}

Definitions:
- projects: personal, academic or open-source projects (not jobs).
- achievements: awards, competition wins or ranks, scholarships (not job duties).
- certifications: certificates and completed courses.
- experience: jobs and internships.
- skills: technologies and tools named in the resume, exactly as written.
- education.level: highest degree completed or in progress; "none" if no education is stated.`;

const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();
const round2 = (n) => Math.round(n * 100) / 100;
const LEVEL = {
  none: 0,
  school: 1,
  diploma: 2,
  bachelors: 3,
  masters: 4,
  doctorate: 5,
};

// Keep only items whose quote really appears in the resume; confidence reflects the share that did.
function grounded(items, haystack) {
  const kept = items.filter((i) => {
    const q = norm(i.quote);
    return q.length >= 3 && haystack.includes(q);
  });
  const confidence = items.length
    ? round2(BASE * (kept.length / items.length))
    : NONE_FOUND;
  return { kept, confidence };
}

export default {
  name: "resume_llm",
  metricIds: METRIC_IDS,

  shouldRun(member) {
    if (!llmEnabled()) return false;
    if (member.metrics["resume.text"]?.status !== "ok") return false;
    if (env.llm.mode === "all") return true;
    return METRIC_IDS.some(
      (id) => member.metrics[id]?.status === "low_confidence",
    );
  },

  async refine(member) {
    const source = redactPii(member.metrics["resume.text"].value).slice(
      0,
      TEXT_CAP,
    );
    const haystack = norm(source);

    const data = await extractStructured({
      task: "resume",
      promptVersion: PROMPT_VERSION,
      system: SYSTEM,
      prompt: `Resume text:\n<<<\n${source}\n>>>`,
      schema: Schema,
    });

    const make = (id, value, confidence) => {
      const entry = ok(id, value, { origin: "llm", confidence });
      entry.model = llmModelName();
      return entry;
    };

    const projects = grounded(data.projects, haystack);
    const achievements = grounded(data.achievements, haystack);
    const certifications = grounded(data.certifications, haystack);
    const publications = grounded(data.publications, haystack);
    const experience = grounded(data.experience, haystack);

    // Skills: each must appear verbatim (case-insensitive) in the resume
    const unique = [
      ...new Map(data.skills.map((s) => [norm(s), s.trim()])).values(),
    ];
    const skills = unique.filter(
      (s) => norm(s).length <= 40 && haystack.includes(norm(s)),
    );
    const skillsConf = unique.length
      ? round2(BASE * (skills.length / unique.length))
      : NONE_FOUND;

    const edu = data.education;
    const eduConf =
      edu.level === "none"
        ? NONE_FOUND
        : edu.quote && haystack.includes(norm(edu.quote))
          ? BASE
          : 0.3;

    return {
      "resume.skills": make("resume.skills", skills, skillsConf),
      "resume.project_count": make(
        "resume.project_count",
        projects.kept.length,
        projects.confidence,
      ),
      "resume.achievement_count": make(
        "resume.achievement_count",
        achievements.kept.length,
        achievements.confidence,
      ),
      "resume.certification_count": make(
        "resume.certification_count",
        certifications.kept.length,
        certifications.confidence,
      ),
      "resume.internship_count": make(
        "resume.internship_count",
        experience.kept.length,
        experience.confidence,
      ),
      "resume.publication_count": make(
        "resume.publication_count",
        publications.kept.length,
        publications.confidence,
      ),
      "resume.education_level": make(
        "resume.education_level",
        LEVEL[edu.level],
        eduConf,
      ),
    };
  },
};
