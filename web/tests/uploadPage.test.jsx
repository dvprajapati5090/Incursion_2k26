// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  uploadFile: vi.fn(), getImport: vi.fn(), enrichImport: vi.fn(), getEnriched: vi.fn(), getHealth: vi.fn(),
}));
vi.mock("../src/lib/api.js", () => api);
import UploadPage from "../src/pages/UploadPage.jsx";
import useImportStore from "../src/stores/importStore.js";
import usePresetsStore from "../src/stores/presetsStore.js";

beforeEach(() => {
  useImportStore.getState().reset();
  usePresetsStore.setState({ presets: [], auditLog: [] });
  api.uploadFile.mockReset();
  api.getImport.mockReset();
  api.getHealth.mockReset().mockResolvedValue({ status: "ok" });
});
afterEach(() => cleanup());

function renderPage() {
  return render(<MemoryRouter><UploadPage /></MemoryRouter>);
}

describe("registration upload user flow", () => {
  it("shows a useful validation message for an unsupported extension without uploading", async () => {
    renderPage();
    fireEvent.change(document.getElementById("file-input"), {
      target: { files: [new File(["bad"], "teams.txt", { type: "text/plain" })] },
    });
    expect(await screen.findByText("Only .csv and .json files are supported")).toBeTruthy();
    expect(api.uploadFile).not.toHaveBeenCalled();
  });

  it("uploads a valid CSV and shows the imported file state", async () => {
    api.uploadFile.mockResolvedValue({ importId: "imp_12345678", report: { teamsFound: 1, columns: { extra: [] } } });
    api.getImport.mockResolvedValue({ teams: [{ teamId: "T1", members: [] }] });
    renderPage();
    fireEvent.change(document.getElementById("file-input"), {
      target: { files: [new File(["team_id\nT1"], "teams.csv", { type: "text/csv" })] },
    });
    await waitFor(() => expect(useImportStore.getState().phase).toBe("imported"));
    expect(screen.getByText("teams.csv")).toBeTruthy();
    expect(useImportStore.getState().rawTeams[0].teamId).toBe("T1");
  });
});
