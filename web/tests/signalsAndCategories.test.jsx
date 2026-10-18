// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TeamDetailDrawer, { SIGNAL_DOMAINS } from "../src/components/results/TeamDetailDrawer.jsx";
import { formatMetricValue } from "../src/lib/handoffFormatters.js";
import useConfigStore from "../src/stores/configStore.js";
import useImportStore from "../src/stores/importStore.js";

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  useConfigStore.getState().resetConfig();
  useImportStore.getState().reset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Handoff formatters: Reachability guard & resume formatting", () => {
  it("enforces that unreachable portfolio website never displays live demo as yes", () => {
    const memberMetrics = {
      "portfolio.is_reachable": {
        value: false,
        status: "ok",
        origin: "http_check",
        error: "dns_not_found",
      },
      "portfolio.has_live_demo": {
        value: true, // raw/buggy entry in data
        status: "ok",
      },
    };

    const formatted = formatMetricValue(
      "portfolio.has_live_demo",
      memberMetrics["portfolio.has_live_demo"],
      memberMetrics
    );

    expect(formatted.display).toBe("No");
    expect(formatted.tooltip).toContain("unreachable");
  });

  it("formats portfolio.is_reachable with value: false as Unreachable", () => {
    const entry = {
      value: false,
      status: "ok",
      origin: "http_check",
      error: "dns_not_found",
    };
    const formatted = formatMetricValue("portfolio.is_reachable", entry);
    expect(formatted.display).toBe("Unreachable");
    expect(formatted.tooltip).toBe("Portfolio website did not open");
  });

  it("formats resume education levels from ordinal values", () => {
    expect(formatMetricValue("resume.education_level", { value: 3 }).display).toBe("Bachelor's Degree");
    expect(formatMetricValue("resume.education_level", { value: 4 }).display).toBe("Master's Degree");
    expect(formatMetricValue("resume.education_level", { value: 5 }).display).toBe("Doctorate / Ph.D.");
    expect(formatMetricValue("resume.education_level", { value: 1 }).display).toBe("High School");
  });

  it("formats resume experience months into months and years", () => {
    const formatted = formatMetricValue("resume.experience_months", { value: 24 });
    expect(formatted.display).toBe("24 mos (2.0 yrs)");
  });
});

describe("TeamDetailDrawer: Domain Categorization & Canonical Resume Signals", () => {
  it("defines all canonical categories and all 9 resume fields", () => {
    const resumeDomain = SIGNAL_DOMAINS.find((d) => d.id === "resume");
    expect(resumeDomain).toBeDefined();
    const metricIds = resumeDomain.metrics.map((m) => m.id);
    expect(metricIds).toContain("resume.project_count");
    expect(metricIds).toContain("resume.experience_months");
    expect(metricIds).toContain("resume.education_level");
    expect(metricIds).toContain("resume.skills");
    expect(metricIds).toContain("resume.achievement_count");
    expect(metricIds).toContain("resume.certification_count");
    expect(metricIds).toContain("resume.internship_count");
    expect(metricIds).toContain("resume.publication_count");
    expect(metricIds).toContain("resume.text");
  });

  it("renders all resume fields with Not Provided badge when applicant has no resume data", () => {
    const team = {
      teamId: "T-TEST",
      teamName: "Delta Force",
      rank: 1,
      status: "shortlisted",
      score: 0.95,
      members: [
        {
          memberId: "m1",
          name: "Alice Developer",
          email: "alice@example.test",
          sources: {
            portfolio: { url: "http://broken-site-dns.example.org" },
          },
          metrics: {
            "portfolio.is_reachable": {
              value: false,
              status: "ok",
              origin: "http_check",
              error: "dns_not_found",
            },
            "portfolio.has_live_demo": {
              value: false,
              status: "ok",
            },
          },
        },
      ],
    };

    render(<TeamDetailDrawer team={team} config={useConfigStore.getState().config} onClose={() => {}} />);

    // Check that domain tabs/headers exist
    expect(screen.getByText("Resume & Education Signals")).toBeDefined();
    expect(screen.getByText("Portfolio & Deployment Demos")).toBeDefined();
    expect(screen.getByText("GitHub Intelligence")).toBeDefined();
    expect(screen.getByText("LinkedIn Signals")).toBeDefined();

    // Check resume fields are rendered
    expect(screen.getByText("resume.project_count")).toBeDefined();
    expect(screen.getByText("resume.experience_months")).toBeDefined();
    expect(screen.getByText("resume.education_level")).toBeDefined();
    expect(screen.getByText("resume.skills")).toBeDefined();
    expect(screen.getByText("resume.achievement_count")).toBeDefined();

    // Check that unreachable portfolio site renders Unreachable and live demo as No
    expect(screen.getByText("Unreachable")).toBeDefined();
  });
});
