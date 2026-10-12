// Google Drive "share" links and Dropbox links don't download directly; convert them.
export function resolveResumeUrl(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    throw new Error("invalid_resume_url");
  }

  if (u.hostname === "drive.google.com") {
    const id =
      u.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? u.searchParams.get("id");
    if (!id) throw new Error("unsupported_drive_link");
    return `https://drive.google.com/uc?export=download&id=${id}`;
  }
  if (u.hostname === "docs.google.com")
    throw new Error("google_doc_link_export_as_pdf_instead");
  if (/(^|\.)dropbox\.com$/.test(u.hostname)) {
    u.searchParams.set("dl", "1");
    return u.toString();
  }
  return u.toString();
}
