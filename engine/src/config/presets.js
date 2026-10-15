/**
 * Curated strategy presets for hackathon organizers.
 * Organizers can pick a preset as a starting point and tune weights/thresholds.
 */
export const PRESETS = {
  dev_heavy: {
    id: "dev_heavy",
    name: "Developer & Open Source Heavy",
    description: "Prioritizes GitHub activity, contributions, and code repositories over static resumes.",
    topX: 50,
    criteria: [
      {
        metric: "github.contributions_1y",
        weight: 50,
        aggregation: "mean_max",
        direction: "higher",
        normalization: { method: "linear", min: 0, max: 200 }
      },
      {
        metric: "github.original_repos",
        weight: 30,
        aggregation: "max",
        direction: "higher",
        normalization: { method: "linear", min: 0, max: 15 }
      },
      {
        metric: "resume.project_count",
        weight: 20,
        aggregation: "mean",
        direction: "higher",
        normalization: { method: "linear", min: 0, max: 8 }
      }
    ],
    filters: [
      {
        field: "github.contributions_1y",
        scope: "any_member",
        operator: "gte",
        value: 20
      }
    ]
  },

  balanced: {
    id: "balanced",
    name: "Balanced Holistic Review",
    description: "Evenly balances technical projects, open-source activity, and hackathon/extracurricular achievements.",
    topX: 50,
    criteria: [
      {
        metric: "github.contributions_1y",
        weight: 35,
        aggregation: "mean_max",
        direction: "higher",
        normalization: { method: "linear", min: 0, max: 150 }
      },
      {
        metric: "resume.project_count",
        weight: 35,
        aggregation: "mean",
        direction: "higher",
        normalization: { method: "linear", min: 0, max: 8 }
      },
      {
        metric: "resume.achievement_count",
        weight: 30,
        aggregation: "max",
        direction: "higher",
        normalization: { method: "linear", min: 0, max: 5 }
      }
    ],
    filters: []
  },

  experience_first: {
    id: "experience_first",
    name: "Experience & Track Record First",
    description: "Favors practical experience, past internships, certifications, and awards.",
    topX: 50,
    criteria: [
      {
        metric: "resume.experience_months",
        weight: 40,
        aggregation: "max",
        direction: "higher",
        normalization: { method: "linear", min: 0, max: 24 }
      },
      {
        metric: "resume.achievement_count",
        weight: 30,
        aggregation: "max",
        direction: "higher",
        normalization: { method: "linear", min: 0, max: 5 }
      },
      {
        metric: "github.contributions_1y",
        weight: 30,
        aggregation: "mean",
        direction: "higher",
        normalization: { method: "linear", min: 0, max: 100 }
      }
    ],
    filters: []
  }
};

export function getPreset(presetId, customTopX = null) {
  const preset = PRESETS[presetId];
  if (!preset) {
    throw new Error(`Unknown preset: ${presetId}. Available presets: ${Object.keys(PRESETS).join(", ")}`);
  }

  const cloned = structuredClone(preset);
  if (customTopX !== null && Number.isInteger(customTopX) && customTopX > 0) {
    cloned.topX = customTopX;
  }
  return cloned;
}

export function listPresets() {
  return Object.values(PRESETS).map(({ id, name, description, criteria }) => ({
    id,
    name,
    description,
    criteriaCount: criteria.length
  }));
}
