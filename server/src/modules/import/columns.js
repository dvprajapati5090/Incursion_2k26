export const ALIASES = {
  team_id: ["team_id", "teamid", "team_no", "team_number"],
  team_name: ["team_name", "team"],
  member_name: ["member_name", "name", "full_name"],
  member_email: ["member_email", "email", "email_address"],
  is_lead: ["is_lead", "lead", "team_lead"],
  resume_url: ["resume_url", "resume", "resume_link", "cv", "cv_link"],
  resume_text: ["resume_text"],
  github_url: ["github_url", "github", "github_link", "github_profile"],
  linkedin_url: [
    "linkedin_url",
    "linkedin",
    "linkedin_link",
    "linkedin_profile",
  ],
  portfolio_url: ["portfolio_url", "portfolio", "portfolio_link", "website"],
};

export function normalizeHeader(h) {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// columnMap (optional, from the frontend): { canonicalName: "Original Header" }
export function buildHeaderMap(headers, columnMap = {}) {
  const map = {}; // normalizedHeader -> canonical

  for (const [canonical, original] of Object.entries(columnMap)) {
    map[normalizeHeader(original)] = canonical;
  }

  for (const h of headers) {
    const n = normalizeHeader(h);
    if (map[n]) continue;
    for (const [canonical, aliases] of Object.entries(ALIASES)) {
      if (aliases.includes(n)) {
        map[n] = canonical;
        break;
      }
    }
  }
  return map;
}
