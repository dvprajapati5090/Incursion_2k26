import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_REDIRECTS = 5;

const blocked = (message) =>
  Object.assign(new Error(message), { blocked: true });

function isPrivateIp(ip) {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  const v = ip.toLowerCase();
  return (
    v === "::1" ||
    v === "::" ||
    v.startsWith("fc") ||
    v.startsWith("fd") ||
    v.startsWith("fe80") ||
    v.startsWith("::ffff:")
  );
}

// Refuse anything that is not a public http(s) host. Checked again on every redirect.
async function assertPublicHost(u) {
  if (!["http:", "https:"].includes(u.protocol))
    throw blocked("url_scheme_not_allowed");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  )
    throw blocked("url_host_not_allowed");

  let addrs;
  try {
    addrs = isIP(host)
      ? [{ address: host }]
      : await lookup(host, { all: true });
  } catch {
    throw new Error("dns_not_found");
  }
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address)))
    throw blocked("url_resolves_to_private_address");
}

async function readCapped(res, maxBytes) {
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
    if (total > maxBytes) {
      truncated = true;
      await reader.cancel();
      break;
    }
  }
  return { buffer: Buffer.concat(chunks), truncated };
}

// Safe download of any public URL: manual redirects (re-checked each hop), size cap, timeout.
export async function safeFetchBuffer(
  startUrl,
  { maxBytes = 1_000_000, timeoutMs = 15_000, accept = "*/*" } = {},
) {
  let current;
  try {
    current = new URL(startUrl);
  } catch {
    throw blocked("invalid_url");
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(current);

    let res;
    try {
      res = await fetch(current, {
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
        headers: { "User-Agent": "team-shortlist-enrichment", Accept: accept },
      });
    } catch (e) {
      throw new Error(e.name === "TimeoutError" ? "timeout" : "network_error");
    }

    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location"), current);
      continue;
    }
    if (!res.ok) throw new Error(`http_${res.status}`);

    let body;
    try {
      body = await readCapped(res, maxBytes);
    } catch (e) {
      throw new Error(e.name === "TimeoutError" ? "timeout" : "network_error");
    }
    return {
      finalUrl: current.toString(),
      contentType: res.headers.get("content-type") ?? "",
      ...body,
    };
  }
  throw new Error("too_many_redirects");
}

export async function safeFetchHtml(startUrl) {
  const { finalUrl, contentType, buffer } = await safeFetchBuffer(startUrl, {
    accept: "text/html",
  });
  if (!/text\/html|application\/xhtml/i.test(contentType))
    throw new Error("not_html");
  return { finalUrl, html: buffer.toString("utf8") }; // a truncated page is fine: the top is enough
}
