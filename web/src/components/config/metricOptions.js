/**
 * metricOptions.js — Grouped metric options for dropdowns.
 * Matches metrics.registry.json and the Enrichment Backend Handoff specifications.
 */
export const METRIC_OPTIONS = [
  {
    group: "GitHub (12)",
    options: [
      { value: "github.contributions_1y",   label: "GitHub: Contributions (past 12 months)" },
      { value: "github.public_repos",        label: "GitHub: Public repos" },
      { value: "github.original_repos",      label: "GitHub: Original repos (non-forks)" },
      { value: "github.forked_ratio",        label: "GitHub: Forked ratio (0 to 1)" },
      { value: "github.empty_repo_ratio",    label: "GitHub: Empty repo ratio (0 to 1)" },
      { value: "github.stars_received",      label: "GitHub: Stars received on original repos" },
      { value: "github.merged_prs_1y",       label: "GitHub: Merged PRs (past 12 months)" },
      { value: "github.active_months_1y",    label: "GitHub: Active months (0 to 12)" },
      { value: "github.last_activity_days",  label: "GitHub: Days since last activity" },
      { value: "github.account_age_days",    label: "GitHub: Account age (days)" },
      { value: "github.language_count",      label: "GitHub: Distinct languages count" },
    ],
  },
  {
    group: "Resume (9)",
    options: [
      { value: "resume.project_count",       label: "Resume: Project count" },
      { value: "resume.achievement_count",   label: "Resume: Achievement count (wins, ranks)" },
      { value: "resume.certification_count", label: "Resume: Certification count" },
      { value: "resume.internship_count",    label: "Resume: Internship & job count" },
      { value: "resume.experience_months",   label: "Resume: Experience (months, overlaps merged)" },
      { value: "resume.publication_count",   label: "Resume: Paper & publication count" },
      { value: "resume.education_level",     label: "Resume: Education level (0 to 5 scale)" },
      { value: "resume.keyword_match",       label: "Resume: Keyword match (Engine Computed)", isComputed: true },
    ],
  },
  {
    group: "LinkedIn (5 delivered, 1 reserved)",
    options: [
      {
        value: "linkedin.post_count_1y",
        label: "LinkedIn: Posts (past year)",
        disabled: true,
        disabledReason: "Reserved: needs LinkedIn full data export",
      },
      { value: "linkedin.text",                label: "LinkedIn: Headline & text" },
      { value: "linkedin.experience_count",    label: "LinkedIn: Positions listed" },
      { value: "linkedin.certification_count", label: "LinkedIn: Certifications listed" },
      { value: "linkedin.endorsement_count",   label: "LinkedIn: Skill endorsements (pasted text only)" },
      { value: "linkedin.skills",              label: "LinkedIn: Skills listed" },
    ],
  },
  {
    group: "Portfolio (5)",
    options: [
      { value: "portfolio.is_reachable",    label: "Portfolio: Site reachable (boolean)" },
      { value: "portfolio.project_count",   label: "Portfolio: Projects displayed count" },
      { value: "portfolio.has_live_demo",   label: "Portfolio: Has live deployment demo" },
    ],
  },
  {
    group: "Team & Cohort (Engine Computed)",
    options: [
      { value: "team.size",          label: "Team: Member count (Engine Computed)", isComputed: true },
      { value: "team.data_coverage", label: "Team: Data coverage ratio (Engine Computed)", isComputed: true },
    ],
  },
];
