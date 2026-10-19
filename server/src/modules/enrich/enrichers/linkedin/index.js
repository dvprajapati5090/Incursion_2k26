import { notProvided } from "../../../metrics/metricValue.js";
import { getResumeText } from "../resume/index.js";
import { toMetrics, METRIC_IDS } from "./parse.js";

// We never fetch linkedin.com. We only analyse what the participant provided:
// pasted profile text, or a PDF made with LinkedIn's "Save to PDF".
export default {
  name: "linkedin",
  source: "linkedin",
  metricIds: METRIC_IDS,

  async enrich(member) {
    const src = member.sources?.linkedin;
    if (src?.text) return toMetrics(src.text, "form_text");
    if (src?.pdfUrl)
      return toMetrics(await getResumeText(src.pdfUrl), "pdf_text");

    // Profile link only provided: cannot scrape LinkedIn; applicant must paste text or export PDF
    const reason = src?.url
      ? "profile_link_only_no_text_or_pdf"
      : "not_provided_by_applicant";

    return Object.fromEntries(
      METRIC_IDS.map((id) => [
        id,
        { ...notProvided(), reason },
      ]),
    );
  },
};
