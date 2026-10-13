// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let worker;
class WorkerStub {
  constructor() { worker = this; this.postMessage = vi.fn(); this.terminate = vi.fn(); }
}
vi.stubGlobal("Worker", WorkerStub);
import ConfigPage from "../src/pages/ConfigPage.jsx";
import useConfigStore from "../src/stores/configStore.js";
import useImportStore from "../src/stores/importStore.js";
import useResultsStore from "../src/stores/resultsStore.js";
import usePresetsStore from "../src/stores/presetsStore.js";

beforeEach(() => {
  worker = null;
  useConfigStore.getState().resetConfig();
  useImportStore.getState().reset();
  useResultsStore.getState().clearResults();
  usePresetsStore.setState({ presets: [], auditLog: [] });
  useImportStore.setState({ rawTeams: [{ teamId: "T1", members: [] }] });
});
afterEach(() => cleanup());

describe("live re-ranking configuration flow", () => {
  it("reruns the worker when scoring weights change in live mode", async () => {
    render(<MemoryRouter><ConfigPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: /Live Worker Ranking/ }));
    await waitFor(() => expect(worker.postMessage).toHaveBeenCalledTimes(1));
    const initialMessage = worker.postMessage.mock.calls[0][0];
    expect(initialMessage.type).toBe("RUN");

    const criterion = useConfigStore.getState().config.criteria[0];
    useConfigStore.getState().updateCriterion(criterion.id, { weight: criterion.weight + 1 });
    await waitFor(() => expect(worker.postMessage).toHaveBeenCalledTimes(2));
    expect(worker.postMessage.mock.calls[1][0].config.criteria[0].weight).toBe(criterion.weight + 1);
  });
});
