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
});
