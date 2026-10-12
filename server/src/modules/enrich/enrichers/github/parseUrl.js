const RESERVED = new Set([
  "orgs",
  "topics",
  "settings",
  "marketplace",
  "about",
  "features",
  "pricing",
  "login",
  "sponsors",
  "explore",
  "collections",
  "enterprise",
  "search",
  "notifications",
]);

// "https://github.com/user/some-repo" -> "user"; anything that isn't a profile -> null
export function githubLogin(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (!/(^|\.)github\.com$/i.test(u.hostname)) return null;
  const first = u.pathname.split("/").filter(Boolean)[0];
  if (!first || RESERVED.has(first.toLowerCase())) return null;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test(first)) return null;
  return first;
}
