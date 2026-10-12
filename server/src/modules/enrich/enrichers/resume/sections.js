export const BULLET = /^\s*(?:[•●▪◦‣∙·\uF0B7]\s*|[-–—*]\s+)/;

const HEADINGS = [
  [
    "projects",
    /^(?:(?:personal|academic|key|selected|major|technical|side)\s+)?projects?(?:\s+(?:and|&)\s+[a-z ]+)?$/,
  ],
  [
    "experience",
    /^(?:(?:work|professional|relevant|industry)\s+)?(?:experience|employment(?: history)?|internships?|work history)(?:\s+(?:and|&)\s+[a-z ]+)?$/,
  ],
  [
    "education",
    /^education(?:al)?(?:\s+(?:background|qualifications?|details))?$|^academic(?:s| background| qualifications?)$/,
  ],
  [
    "skills",
    /^(?:(?:technical|key|core|professional)\s+)?skills?(?:\s+(?:and|&)\s+[a-z ]+)?$|^technologies$|^tech stack$|^technical expertise$/,
  ],
  [
    "achievements",
    /^(?:achievements?|awards?|honou?rs?|accomplishments?|scholarships?|(?:awards?|honou?rs?) (?:and|&) (?:achievements?|recognition)|achievements? (?:and|&) (?:awards?|honou?rs?))$/,
  ],
  [
    "certifications",
    /^(?:certifications?|certificates?|licenses?(?: (?:and|&) certifications?)?|courses?|online courses?|courses? (?:and|&) certifications?|certifications? (?:and|&) courses?)$/,
  ],
  [
    "publications",
    /^(?:publications?|research(?: papers?| publications?)?|papers?)$/,
  ],
  // headings we recognise only so they END the previous section
  [
    "other",
    /^(?:summary|objective|profile|about(?: me)?|career objective|professional summary|contact|interests?|hobbies|languages?|references?|declaration|extra ?curricular(?: activities)?|positions? of responsibility|volunteer(?:ing)?(?: experience)?|leadership)$/,
  ],
];

function headingKind(line) {
  if (!line || line.length > 40 || BULLET.test(line)) return null;
  const norm = line
    .toLowerCase()
    .replace(/[^a-z& ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (const [kind, re] of HEADINGS) if (re.test(norm)) return kind;
  return null;
}

// -> { projects: [lines], skills: [lines], ... }  (blank lines kept as "")
export function splitSections(text) {
  const sections = {};
  let current = null;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const kind = headingKind(line);
    if (kind) {
      current = kind;
      sections[kind] ??= [];
      continue;
    }
    if (!current) continue;
    if (line === "" && sections[current].at(-1) === "") continue; // collapse blank runs
    sections[current].push(line);
  }
  return sections;
}
