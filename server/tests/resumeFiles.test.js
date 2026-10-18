import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveResumeUrl } from "../src/modules/enrich/enrichers/resume/resolveUrl.js";

vi.mock("unpdf", () => ({
  getDocumentProxy: vi.fn().mockResolvedValue({}),
  extractText: vi.fn(),
}));
import { extractText } from "unpdf";
import { fetchResumeText } from "../src/modules/enrich/enrichers/resume/fetchPdf.js";

const LONG_TEXT =
  "Parsed resume text that is comfortably longer than the fifty character minimum.";
const pdfResponse = () =>
  new Response(new TextEncoder().encode("%PDF-1.4 fake body"), {
    status: 200,
    headers: { "content-type": "application/pdf" },
  });

function stubFetch(...responses) {
  const fetchMock = vi.fn();
  responses.forEach((result) => fetchMock.mockResolvedValueOnce(result));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
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
  it("parses a PDF response", async () => {
    stubFetch(pdfResponse());
    extractText.mockResolvedValueOnce({ text: LONG_TEXT });
    await expect(
      fetchResumeText("https://example.com/resume.pdf"),
    ).resolves.toBe(LONG_TEXT);
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

  it("reports HTTP errors and rejects files over the size limit", async () => {
    stubFetch(new Response("", { status: 404 }));
    await expect(
      fetchResumeText("https://example.com/404"),
    ).rejects.toThrow("resume_http_404");

    stubFetch(
      new Response(null, {
        status: 200,
        headers: { "content-length": String(11 * 1024 * 1024) },
      }),
    );
    await expect(
      fetchResumeText("https://example.com/large.pdf"),
    ).rejects.toThrow("resume_too_large");
  });

  it("rejects scanned PDFs that contain no text", async () => {
    stubFetch(pdfResponse());
    extractText.mockResolvedValueOnce({ text: "too short" });
    await expect(
      fetchResumeText("https://example.com/scan.pdf"),
    ).rejects.toThrow("resume_no_text_scanned_pdf");
  });

  it("maps timeouts and network failures into documented errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    await expect(
      fetchResumeText("https://example.com/resume.pdf"),
    ).rejects.toThrow("resume_fetch_timeout");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network_error")),
    );
    await expect(
      fetchResumeText("https://example.com/resume.pdf"),
    ).rejects.toThrow("resume_fetch_network_error");
  });
});
