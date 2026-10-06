import { z } from "zod";
import { httpError } from "../../utils/httpError.js";

const Source = z
  .object({
    url: z.string().nullable().optional(),
    text: z.string().nullable().optional(),
  })
  .passthrough()
  .nullable()
  .optional();

const MemberSchema = z
  .object({
    memberId: z.string().optional(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    isLead: z.boolean().optional(),
    sources: z
      .object({
        resume: Source,
        github: Source,
        linkedin: Source,
        portfolio: Source,
      })
      .partial()
      .optional(),
    metrics: z.record(z.string(), z.any()).optional(),
    flags: z.array(z.any()).optional(),
  })
  .passthrough();

const TeamSchema = z
  .object({
    teamId: z.union([z.string(), z.number()]),
    teamName: z.string().nullable().optional(),
    fields: z.record(z.string(), z.any()).optional(),
    members: z.array(MemberSchema).min(1),
  })
  .passthrough();

export function normalizeJsonTeams(input) {
  const list = Array.isArray(input) ? input : input?.teams;
  if (!Array.isArray(list)) {
    throw httpError(
      422,
      "BAD_JSON_SHAPE",
      "Expected an array of teams, or an object with a 'teams' array",
    );
  }

  const issues = [];
  const teams = [];
  const seenIds = new Set();
  let skipped = 0;

  list.forEach((raw, i) => {
    const parsed = TeamSchema.safeParse(raw);
    if (!parsed.success) {
      skipped++;
      const first = parsed.error.issues[0];
      issues.push({
        severity: "error",
        code: "INVALID_TEAM",
        row: i + 1,
        message: `Team #${i + 1} skipped: ${first.message} (${first.path.join(".") || "root"})`,
      });
      return;
    }

    const t = parsed.data;
    const teamId = String(t.teamId);
    if (seenIds.has(teamId)) {
      skipped++;
      issues.push({
        severity: "error",
        code: "DUPLICATE_TEAM_ID",
        row: i + 1,
        message: `Team id ${teamId} appears more than once; later entry skipped`,
      });
      return;
    }
    seenIds.add(teamId);

    teams.push({
      teamId,
      teamName: t.teamName ?? null,
      fields: t.fields ?? {},
      members: t.members.map((m, idx) => ({
        memberId: m.memberId ?? `${teamId}-${idx + 1}`,
        name: m.name ?? null,
        email: m.email ? m.email.toLowerCase() : null,
        isLead: m.isLead ?? false,
        sources: {
          resume: m.sources?.resume ?? null,
          github: m.sources?.github ?? null,
          linkedin: m.sources?.linkedin ?? null,
          portfolio: m.sources?.portfolio ?? null,
        },
        metrics: m.metrics ?? {},
        flags: m.flags ?? [],
      })),
    });
  });

  return { teams, issues, skipped };
}
