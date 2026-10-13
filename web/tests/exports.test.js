// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { exportCsv, exportJson } from "../src/lib/exportUtils.js";

afterEach(() => vi.unstubAllGlobals());

class CapturedBlob {
  constructor(parts, options) {
    this.content = parts.join("");
    this.type = options.type;
  }
}

describe("shortlist download exports", () => {
  it("downloads JSON containing the results and exact config used", () => {
    const blobs = [];
    vi.stubGlobal("Blob", CapturedBlob);
    vi.stubGlobal("URL", { createObjectURL: vi.fn((blob) => { blobs.push(blob); return "blob:test"; }), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const config = { selection: { topX: 2 }, criteria: [{ id: "projects", weight: 3 }] };
    const results = [{ teamId: "T1", score: 0.9 }];
    exportJson(results, config, { seed: 9 });
    const exported = JSON.parse(blobs[0].content);
    expect(exported.results).toEqual(results);
    expect(exported.config).toEqual(config);
    expect(exported.seed).toBe(9);
    expect(blobs[0].type).toBe("application/json");
  });

  it("exports CSV rows and a separate JSON config sidecar", () => {
    const blobs = [];
    vi.stubGlobal("Blob", CapturedBlob);
    vi.stubGlobal("URL", { createObjectURL: vi.fn((blob) => { blobs.push(blob); return "blob:test"; }), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const config = { selection: { topX: 1 }, criteria: [] };
    exportCsv([{ teamId: "T1", teamName: "Alpha", status: "shortlisted", rank: 1, score: 0.75 }], config, []);
    expect(blobs).toHaveLength(2);
    expect(blobs[0].content).toContain("T1,Alpha,shortlisted,0.7500");
    expect(blobs[1].type).toBe("application/json");
    expect(JSON.parse(blobs[1].content)).toEqual(config);
  });
});
