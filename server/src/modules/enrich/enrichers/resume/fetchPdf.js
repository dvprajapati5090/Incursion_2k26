import { extractText, getDocumentProxy } from "unpdf";

const MAX_BYTES = 10 * 1024 * 1024;

export async function fetchResumeText(url) {
  let res;
  try {
    res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
      headers: { "User-Agent": "team-shortlist-enrichment" },
    });
  } catch (e) {
    throw new Error(
      e.name === "TimeoutError"
        ? "resume_fetch_timeout"
        : "resume_fetch_network_error",
    );
  }
  if (!res.ok) throw new Error(`resume_http_${res.status}`);
  if (Number(res.headers.get("content-length") || 0) > MAX_BYTES)
    throw new Error("resume_too_large");

  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error("resume_too_large");

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
