import { extractText, getDocumentProxy } from "unpdf";
import { safeFetchBuffer } from "../portfolio/safeFetch.js";

const MAX_BYTES = 10 * 1024 * 1024;

export async function fetchResumeText(url) {
  let result;
  try {
    result = await safeFetchBuffer(url, {
      maxBytes: MAX_BYTES,
      timeoutMs: 20_000,
      accept: "application/pdf,*/*",
    });
  } catch (e) {
    const renamed = {
      timeout: "fetch_timeout",
      network_error: "fetch_network_error",
    };
    throw new Error(`resume_${renamed[e.message] ?? e.message}`);
  }
  if (result.truncated) throw new Error("resume_too_large"); // a cut-off PDF is unreadable

  const buf = new Uint8Array(result.buffer);
  // A private Drive file returns an HTML login page, not a PDF
  const isPdf =
    buf.length > 4 &&
    String.fromCharCode(buf[0], buf[1], buf[2], buf[3]) === "%PDF";
  if (!isPdf) throw new Error("resume_not_a_pdf_or_link_not_public");

  const pdf = await getDocumentProxy(buf);
  const { text } = await extractText(pdf, { mergePages: true });
  const clean = text.trim();
  if (clean.length < 50) throw new Error("resume_no_text_scanned_pdf"); // image-only PDF; OCR is out of scope
  return clean;
}
