// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ResultsTable from "../src/components/results/ResultsTable.jsx";
import TeamDetailDrawer from "../src/components/results/TeamDetailDrawer.jsx";
import TeamComparisonModal from "../src/components/results/TeamComparisonModal.jsx";
import CriteriaEditor from "../src/components/config/CriteriaEditor.jsx";
import FilterEditor from "../src/components/config/FilterEditor.jsx";
import PresetManager from "../src/components/config/PresetManager.jsx";
import SelectionPanel from "../src/components/config/SelectionPanel.jsx";
import useConfigStore from "../src/stores/configStore.js";
import useImportStore from "../src/stores/importStore.js";
import usePresetsStore from "../src/stores/presetsStore.js";

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  useConfigStore.getState().resetConfig();
  useImportStore.getState().reset();
  usePresetsStore.setState({ presets: [], auditLog: [] });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const result = {
  teamId: "T-17", teamName: "Secret Rockets", rank: 1, status: "shortlisted",
  score: 0.875, dataCoverage: 0.5, flags: ["incomplete_data"], cutoffScore: 0.8, margin: 0.075,
  breakdown: [{ criterionId: "projects", label: "Projects", raw: 4, normalized: 0.875, effectiveWeight: 1, contribution: 0.875, status: "ok" }],
  reasons: [{ code: "ABOVE_CUTOFF", margin: 0.075 }],
  members: [{ memberId: "m1", name: "Private Person", email: "private@example.test", sources: {} }],
};

describe("visible results and override controls", () => {
  it("renders ranking, score and missing-data flags, and applies pin/exclude actions", () => {
    render(<ResultsTable data={[result]} config={useConfigStore.getState().config} />);
    const row = screen.getByRole("row", { name: /Secret Rockets/ });
    expect(row.textContent).toContain("0.8750");
    expect(row.textContent).toContain("incomplete_data");

    fireEvent.click(within(row).getByTitle("Pin to shortlist"));
    expect(useConfigStore.getState().config.overrides.pin).toEqual(["T-17"]);
    fireEvent.click(within(row).getByTitle("Exclude team"));
    expect(useConfigStore.getState().config.overrides.pin).toEqual([]);
    expect(useConfigStore.getState().config.overrides.exclude).toEqual(["T-17"]);
    fireEvent.click(within(row).getByTitle("Move to waitlist"));
    expect(useConfigStore.getState().config.overrides.waitlist).toEqual(["T-17"]);
  });

  it("hides names and emails in blind mode while keeping score breakdown visible", () => {
    const config = { ...useConfigStore.getState().config, options: { blindMode: true } };
    render(<><ResultsTable data={[result]} config={config} /><TeamDetailDrawer team={result} config={config} onClose={() => {}} /></>);
    expect(screen.getByRole("row", { name: /Team T-17/ }).textContent).not.toContain("Secret Rockets");
    expect(document.body.textContent).not.toContain("Private Person");
    expect(document.body.textContent).not.toContain("private@example.test");
    expect(document.body.textContent).toContain("0.875");
  });

  it("renders pairwise head-to-head comparison modal with scores and rejection reasons", () => {
    const rejectedTeam = {
      teamId: "T-99",
      teamName: "Underdogs",
      status: "filter_rejected",
      score: null,
      filterResults: [{ metric: "resume.exists", label: "Resume Uploaded", status: "fail", required: true, actual: false }],
      rejectionReasons: ["Failed eligibility rule: Resume Uploaded"],
      members: [{ memberId: "m2", name: "Dev Two", sources: {} }],
    };
    render(
      <TeamComparisonModal
        allTeams={[result, rejectedTeam]}
        initialTeamAId="T-17"
        initialTeamBId="T-99"
        config={useConfigStore.getState().config}
        onClose={() => {}}
      />
    );
    expect(screen.getByText("Head-to-Head Team Comparison")).toBeDefined();
    expect(document.body.textContent).toContain("Secret Rockets");
    expect(document.body.textContent).toContain("Underdogs");
    expect(document.body.textContent).toContain("Disqualification Rationale");
  });
});

describe("selection and criterion controls", () => {
  it("updates topX through the visible selection slider", () => {
    render(<SelectionPanel />);
    const topX = screen.getAllByRole("slider")[0];
    fireEvent.change(topX, { target: { value: "12" } });
    expect(useConfigStore.getState().config.selection.topX).toBe(12);
    expect(document.body.textContent).toContain("#12");
  });

  it("updates criterion weight and enabled state from the editor", () => {
    render(<CriteriaEditor />);
    const sliders = screen.getAllByRole("slider");
    fireEvent.change(sliders[0], { target: { value: "7.5" } });
    expect(useConfigStore.getState().config.criteria[0].weight).toBe(7.5);
    const enabled = screen.getAllByRole("checkbox")[0];
    fireEvent.click(enabled);
    expect(useConfigStore.getState().config.criteria[0].enabled).toBe(false);
  });

  it("adds and removes an eligibility filter through its editor", () => {
    render(<FilterEditor />);
    fireEvent.click(screen.getByRole("button", { name: "Add Filter" }));
    expect(useConfigStore.getState().config.filters).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("button").find((button) => !button.textContent.trim()));
    expect(useConfigStore.getState().config.filters).toHaveLength(1);
  });

  it("loads a saved preset into the active configuration", () => {
    const presetConfig = { ...useConfigStore.getState().config, selection: { ...useConfigStore.getState().config.selection, topX: 7 } };
    usePresetsStore.setState({ presets: [{ id: "p1", name: "Seven", savedAt: "2026-01-01T00:00:00Z", config: presetConfig }] });
    useConfigStore.getState().setTopX(3);
    vi.stubGlobal("confirm", vi.fn(() => true));
    render(<PresetManager />);
    fireEvent.click(screen.getByTitle("Load preset"));
    expect(useConfigStore.getState().config.selection.topX).toBe(7);
  });
});
