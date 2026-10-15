/**
 * metricOptions.js — grouped metric options for dropdowns.
 * Matches metrics.registry.json in the repo root.
 */
export const METRIC_OPTIONS = [
  {
    group: "GitHub",
    options: [
      { value: "github.contributions_1y",   label: "GitHub: Contributions (past year)"     },
      { value: "github.public_repos",        label: "GitHub: Public repos"                  },
      { value: "github.original_repos",      label: "GitHub: Original repos (non-forks)"    },
      { value: "github.forked_ratio",        label: "GitHub: Forked ratio"                   },
      { value: "github.empty_repo_ratio",    label: "GitHub: Empty repo ratio"               },
      { value: "github.stars_received",      label: "GitHub: Stars received"                 },
      { value: "github.merged_prs_1y",       label: "GitHub: Merged PRs (past year)"         },
      { value: "github.active_months_1y",    label: "GitHub: Active months (past year)"      },
      { value: "github.last_activity_days",  label: "GitHub: Days since last activity"       },
      { value: "github.account_age_days",    label: "GitHub: Account age (days)"             },
      { value: "github.language_count",      label: "GitHub: Language diversity"             },
    ],
  },
  {
    group: "Resume",
    options: [
      { value: "resume.project_count",       label: "Resume: Project count"                  },
      { value: "resume.achievement_count",   label: "Resume: Achievement count"              },
      { value: "resume.certification_count", label: "Resume: Certification count"            },
      { value: "resume.internship_count",    label: "Resume: Internship count"               },
      { value: "resume.experience_months",   label: "Resume: Experience (months)"            },
      { value: "resume.publication_count",   label: "Resume: Publication count"              },
      { value: "resume.education_level",     label: "Resume: Education level (0–5)"          },
      { value: "resume.keyword_match",       label: "Resume: Keyword match (ATS-style)"      },
    ],
  },
  {
    group: "LinkedIn",
    options: [
      { value: "linkedin.post_count_1y",       label: "LinkedIn: Posts (past year)"          },
      { value: "linkedin.experience_count",    label: "LinkedIn: Experience count"           },
      { value: "linkedin.certification_count", label: "LinkedIn: Certification count"        },
      { value: "linkedin.endorsement_count",   label: "LinkedIn: Endorsement count"          },
    ],
  },
  {
    group: "Portfolio",
    options: [
      { value: "portfolio.is_reachable",    label: "Portfolio: Is reachable"                  },
      { value: "portfolio.project_count",   label: "Portfolio: Project count"                 },
      { value: "portfolio.has_live_demo",   label: "Portfolio: Has live demo"                 },
    ],
  },
  {
    group: "Team (computed)",
    options: [
      { value: "team.size",          label: "Team: Size (member count)"    },
      { value: "team.data_coverage", label: "Team: Data coverage ratio"    },
    ],
  },
];
