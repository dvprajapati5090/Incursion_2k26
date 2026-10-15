import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveResumeUrl } from "../src/modules/enrich/enrichers/resume/resolveUrl.js";

vi.mock("unpdf", () => ({
  getDocumentProxy: vi.fn(async () => ({ mocked: true })),
  extractText: vi.fn(async () => ({ text: "A parsed resume with more than fifty useful characters for testing." })),
}));
const { fetchResumeText } = await import("../src/modules/enrich/enrichers/resume/fetchPdf.js");

afterEach(() => vi.unstubAllGlobals());

describe("resume link and PDF handling", () => {
  it("resolves Drive and Dropbox share links and rejects unsupported links", () => {
    expect(resolveResumeUrl("https://drive.google.com/file/d/abc123/view")).toContain("id=abc123");
    expect(resolveResumeUrl("https://www.dropbox.com/s/file.pdf?dl=0")).toContain("dl=1");
    expect(() => resolveResumeUrl("not a url")).toThrow("invalid_resume_url");
    expect(() => resolveResumeUrl("https://docs.google.com/document/d/abc")).toThrow("google_doc_link_export_as_pdf_instead");
  });

  it("parses a PDF response but rejects non-PDF, oversized, and unreadable responses", async () => {
    const pdf = new Uint8Array([37, 80, 68, 70, 45, 49]);
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, headers: new Headers(), arrayBuffer: async () => pdf.buffer })
      .mockResolvedValueOnce({ ok: true, headers: new Headers(), arrayBuffer: async () => new TextEncoder().encode("html login").buffer })
      .mockResolvedValueOnce({ ok: false, status: 404, headers: new Headers() })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers({ "content-length": String(11 * 1024 * 1024) }) }));
    await expect(fetchResumeText("https://example.com/resume.pdf")).resolves.toContain("parsed resume");
    await expect(fetchResumeText("https://example.com/private")).rejects.toThrow("resume_not_a_pdf_or_link_not_public");
    await expect(fetchResumeText("https://example.com/404")).rejects.toThrow("resume_http_404");
    await expect(fetchResumeText("https://example.com/large")).rejects.toThrow("resume_too_large");
  });

  it("maps network timeouts into the documented resume error", async () => {
    const error = new Error("timed out");
    error.name = "TimeoutError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error));
    await expect(fetchResumeText("https://example.com/resume.pdf")).rejects.toThrow("resume_fetch_timeout");
  });
});
