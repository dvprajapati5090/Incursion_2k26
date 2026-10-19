import { describe, expect, it } from "vitest";
import { githubLogin } from "../src/modules/enrich/enrichers/github/parseUrl.js";
import mockGithub from "../src/modules/enrich/enrichers/mockGithub.js";
import { parseResume, toMetrics } from "../src/modules/enrich/enrichers/resume/parse.js";

describe("deterministic enrichment helpers", () => {
  it("extracts GitHub profile names and rejects repository and non-GitHub URLs", () => {
    expect(githubLogin("https://github.com/octo-cat/project")).toBe("octo-cat");
    expect(githubLogin("https://github.com/settings/profile")).toBeNull();
    expect(githubLogin("https://example.com/octo-cat")).toBeNull();
    expect(githubLogin("not a URL")).toBeNull();
  });

  it("produces stable mock GitHub metrics and an explicit failure for missing links", async () => {
    const member = { sources: { github: { url: "https://github.com/example" } } };
    const first = await mockGithub.enrich(member);
    expect(await mockGithub.enrich(member)).toEqual(first);
    expect(first["github.contributions_1y"].status).toBe("ok");
    await expect(mockGithub.enrich({ sources: { github: {} } })).rejects.toThrow("no_url");
    await expect(mockGithub.enrich({ sources: { github: { url: "https://github.com/fail" } } })).rejects.toThrow("simulated_fetch_error");
  });

  it("extracts resume skills, project entries and education with confidence metadata", () => {
    const parsed = parseResume("Skills\nLanguages: JavaScript, TypeScript\nProjects\nSite\n- Built a site\n- Added tests\nEducation\nBachelor of Science");
    expect(parsed.skills.value).toEqual(["JavaScript", "TypeScript"]);
    expect(parsed.projects.value).toBe(1);
    expect(parsed.education.value).toBe(3);
    expect(parsed.skills.confidence).toBeGreaterThan(0);
  });

  it("returns low confidence for absent resume sections and never performs an LLM call", () => {
    const parsed = parseResume("");
    expect(parsed.skills.value).toEqual([]);
    expect(parsed.projects.confidence).toBeLessThan(0.5);
    expect(toMetrics("", "unit-test")["resume.project_count"].status).toBe("low_confidence");
  });

  it("parses real LinkedIn export layout with date ranges, top skills, and certifications", async () => {
    const { toMetrics: toLiMetrics } = await import(
      "../src/modules/enrich/enrichers/linkedin/parse.js"
    );
    const linkedInExport = `Contact
www.linkedin.com/in/aaravshah
Top Skills
React
Node.js
Python
Summary
Final year student who likes building web apps.
Experience
TechNova
Backend Developer Intern
June 2025 - August 2025 (3 months)
Mumbai
CodeLab
Web Developer
January 2024 - May 2024 (5 months)
Education
XYZ University
Bachelor of Technology, Computer Science (2022 - 2026)
Certifications
AWS Cloud Practitioner
Google Data Analytics`;

    const metrics = toLiMetrics(linkedInExport, "pdf_text");
    expect(metrics["linkedin.experience_count"].value).toBe(2);
    expect(metrics["linkedin.experience_count"].confidence).toBe(0.8);
    expect(metrics["linkedin.experience_count"].status).toBe("ok");
    expect(metrics["linkedin.skills"].value).toEqual(["React", "Node.js", "Python"]);
    expect(metrics["linkedin.certification_count"].value).toBe(2);
  });

  it("returns low confidence and 0 experience when role is written as bare duration instead of date range", async () => {
    const { toMetrics: toLiMetrics } = await import(
      "../src/modules/enrich/enrichers/linkedin/parse.js"
    );
    const bareDurationText = `Experience
TechNova
Backend Developer
6 mos`;
    const metrics = toLiMetrics(bareDurationText, "pdf_text");
    expect(metrics["linkedin.experience_count"].value).toBe(0);
    expect(metrics["linkedin.experience_count"].status).toBe("low_confidence");
  });

  it("returns profile_link_only_no_text_or_pdf reason when only a profile link is given", async () => {
    const { default: linkedinEnricher } = await import(
      "../src/modules/enrich/enrichers/linkedin/index.js"
    );
    const member = {
      sources: {
        linkedin: { url: "https://linkedin.com/in/aarav", text: null, pdfUrl: null },
      },
    };
    const res = await linkedinEnricher.enrich(member);
    expect(res["linkedin.text"].status).toBe("not_provided");
    expect(res["linkedin.text"].reason).toBe("profile_link_only_no_text_or_pdf");
  });

  it("identifies file links in linkedin_url, routes them to pdfUrl and emits LINKEDIN_FILE_IN_URL_COLUMN warning", async () => {
    const { normalizeRows } = await import("../src/modules/import/normalize.js");
    const { buildHeaderMap } = await import("../src/modules/import/columns.js");
    const rows = [
      {
        team_id: "T-01",
        member_name: "Aarav",
        member_email: "a@example.com",
        linkedin_url: "https://drive.google.com/file/d/12345/view",
      },
    ];
    const headerMap = buildHeaderMap(Object.keys(rows[0]));
    const { teams, issues } = normalizeRows(rows, headerMap);

    expect(teams[0].members[0].sources.linkedin.pdfUrl).toContain("drive.google.com");
    expect(teams[0].members[0].sources.linkedin.url).toBeUndefined();
    const warn = issues.find((i) => i.code === "LINKEDIN_FILE_IN_URL_COLUMN");
    expect(warn).toBeDefined();
    expect(warn.column).toBe("linkedin_url");
  });
});
