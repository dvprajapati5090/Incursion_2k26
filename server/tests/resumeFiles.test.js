import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// No real network in tests: DNS always answers with a public address, and PDF parsing is faked.
vi.mock("node:dns/promises", () => ({
  lookup: vi.fn().mockResolvedValue([{ address: "93.184.216.34" }]),
}));
vi.mock("unpdf", () => ({
  getDocumentProxy: vi.fn().mockResolvedValue({}),
  extractText: vi.fn(),
}));

import { extractText } from "unpdf";
import { fetchResumeText } from "../src/modules/enrich/enrichers/resume/fetchPdf.js";
import { resolveResumeUrl } from "../src/modules/enrich/enrichers/resume/resolveUrl.js";

const LONG_TEXT =
  "Parsed resume text that is comfortably longer than the fifty character minimum.";

const pdfResponse = () =>
  new Response(new TextEncoder().encode("%PDF-1.4 fake body"), {
    status: 200,
    headers: { "content-type": "application/pdf" },
  });

// Each call to fetch returns the next response in order
function stubFetch(...responses) {
  const fn = vi.fn();
  responses.forEach((r) => fn.mockResolvedValueOnce(r));
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(() => extractText.mockReset());
afterEach(() => vi.unstubAllGlobals());

describe("resume link resolving", () => {
  it("resolves Drive and Dropbox share links and rejects unsupported links", () => {
    expect(
      resolveResumeUrl("https://drive.google.com/file/d/ABC123/view"),
    ).toBe("https://drive.google.com/uc?export=download&id=ABC123");
    expect(resolveResumeUrl("https://drive.google.com/open?id=XYZ")).toBe(
      "https://drive.google.com/uc?export=download&id=XYZ",
    );
    expect(resolveResumeUrl("https://www.dropbox.com/s/abc/cv.pdf?dl=0")).toBe(
      "https://www.dropbox.com/s/abc/cv.pdf?dl=1",
    );
    expect(() =>
      resolveResumeUrl("https://docs.google.com/document/d/ABC/edit"),
    ).toThrow("google_doc_link_export_as_pdf_instead");
    expect(() =>
      resolveResumeUrl("https://drive.google.com/drive/folders/abc"),
    ).toThrow("unsupported_drive_link");
    expect(() => resolveResumeUrl("not a url")).toThrow("invalid_resume_url");
  });
});

describe("resume PDF download", () => {
  it("parses a real PDF response", async () => {
    stubFetch(pdfResponse());
    extractText.mockResolvedValueOnce({ text: LONG_TEXT });
    await expect(
      fetchResumeText("https://example.com/resume.pdf"),
    ).resolves.toContain("Parsed resume");
  });

  it("rejects a non-PDF response such as a private Drive login page", async () => {
    stubFetch(
      new Response("<html>login</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );
    await expect(
      fetchResumeText("https://example.com/private"),
    ).rejects.toThrow("resume_not_a_pdf_or_link_not_public");
  });

  it("reports HTTP errors", async () => {
    stubFetch(new Response("", { status: 404 }));
    await expect(fetchResumeText("https://example.com/404")).rejects.toThrow(
      "resume_http_404",
    );
  });

  it("rejects files over the size limit", async () => {
    stubFetch(new Response(new Uint8Array(11 * 1024 * 1024), { status: 200 }));
    await expect(
      fetchResumeText("https://example.com/huge.pdf"),
    ).rejects.toThrow("resume_too_large");
  });

  it("rejects scanned PDFs that contain no text", async () => {
    stubFetch(pdfResponse());
    extractText.mockResolvedValueOnce({ text: "too short" });
    await expect(
      fetchResumeText("https://example.com/scan.pdf"),
    ).rejects.toThrow("resume_no_text_scanned_pdf");
  });

  it("maps timeouts and network failures into the documented resume errors", async () => {
    const timeout = new Error("timed out");
    timeout.name = "TimeoutError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeout));
    await expect(
      fetchResumeText("https://example.com/resume.pdf"),
    ).rejects.toThrow("resume_fetch_timeout");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    );
    await expect(
      fetchResumeText("https://example.com/resume.pdf"),
    ).rejects.toThrow("resume_fetch_network_error");
  });
});

describe("resume download security guard", () => {
  it("never fetches localhost or private addresses", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchResumeText("http://localhost/x")).rejects.toThrow(
      "resume_url_host_not_allowed",
    );
    await expect(fetchResumeText("http://192.168.1.10/cv.pdf")).rejects.toThrow(
      "resume_url_resolves_to_private_address",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks a redirect that points at a private address", async () => {
    stubFetch(
      new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/secret" },
      }),
    );
    await expect(fetchResumeText("https://example.com/r.pdf")).rejects.toThrow(
      "resume_url_resolves_to_private_address",
    );
  });
});
