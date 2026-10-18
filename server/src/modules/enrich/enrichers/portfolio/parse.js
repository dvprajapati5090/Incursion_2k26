import * as cheerio from "cheerio";
import { ok } from "../../../metrics/metricValue.js";
import { TECH } from "./techDictionary.js";

export const METRIC_IDS = [
  "portfolio.is_reachable",
  "portfolio.project_count",
  "portfolio.has_live_demo",
  "portfolio.tech_stack",
  "portfolio.text",
];

const TEXT_CAP = 20_000;
const THIN_TEXT_CHARS = 200; // below this the page is probably rendered in the browser (React/Vite SPA)
const THIN_CONFIDENCE = 0.3;

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const MATCHERS = TECH.map(([name, aliases]) => [
  name,
  new RegExp(
    `(?<![a-z0-9.])(?:${aliases.map(esc).join("|")})(?![a-z0-9])`,
    "i",
  ),
]);

const PROJECT_HEADING =
  /^(?:my |selected |featured |recent |personal |side |academic )?(?:projects?|works?|portfolio|creations)$/i;
const DEPLOY_HOSTS =
  /(?:vercel\.app|netlify\.app|herokuapp\.com|onrender\.com|pages\.dev|github\.io|web\.app|firebaseapp\.com|surge\.sh|railway\.app|fly\.dev|streamlit\.app|hf\.space|replit\.app|glitch\.me)$/i;
const NOT_DEMO_HOSTS =
  /(?:^|\.)(?:github\.com|gitlab\.com|bitbucket\.org|linkedin\.com|twitter\.com|x\.com|instagram\.com|facebook\.com|youtube\.com|medium\.com|leetcode\.com|codeforces\.com|kaggle\.com)$/i;
const DEMO_LABEL = /\b(?:live|demo|try it|deployed|preview)\b/i;

const clean = (s) => s.replace(/\s+/g, " ").trim();

function countProjects($, finalUrl) {
  const heading = $("h1,h2,h3,h4")
    .filter((_, el) => PROJECT_HEADING.test(clean($(el).text())))
    .first();

  if (heading.length) {
    const level = Number(heading[0].tagName[1]);
    const section = heading.closest("section");
    const scope = section.length
      ? section
      : heading.nextUntil(
          Array.from({ length: level }, (_, i) => `h${i + 1}`).join(","),
        );

    // Project cards usually carry their own title heading (h3-h5)
    const titles = scope.find("h3,h4,h5").addBack("h3,h4,h5").length;
    if (titles > 0) return { value: titles, confidence: 0.65 };

    const cards =
      scope.find("article").length || scope.find("li:has(a)").length;
    if (cards > 0) return { value: cards, confidence: 0.55 };
  }

  // Fallback: distinct GitHub repo links anywhere on the page
  const repos = new Set();
  $("a[href]").each((_, a) => {
    try {
      const u = new URL($(a).attr("href"), finalUrl);
      if (
        /(^|\.)github\.com$/i.test(u.hostname) &&
        /^\/[^/]+\/[^/]+\/?$/.test(u.pathname)
      ) {
        repos.add(u.pathname.toLowerCase().replace(/\/$/, ""));
      }
    } catch {
      /* ignore bad hrefs */
    }
  });
  if (repos.size > 0) return { value: repos.size, confidence: 0.5 };

  return { value: 0, confidence: THIN_CONFIDENCE };
}

function hasLiveDemo($, finalUrl) {
  const own = new URL(finalUrl).hostname.replace(/^www\./, "");
  let found = false;
  $("a[href]").each((_, a) => {
    if (found) return;
    try {
      const u = new URL($(a).attr("href"), finalUrl);
      if (!/^https?:$/.test(u.protocol)) return;
      const host = u.hostname.replace(/^www\./, "");
      if (host === own || NOT_DEMO_HOSTS.test(host)) return;
      if (DEPLOY_HOSTS.test(host) || DEMO_LABEL.test(clean($(a).text())))
        found = true;
    } catch {
      /* ignore bad hrefs */
    }
  });
  return found;
}

export function toMetrics({ html, finalUrl }) {
  const $ = cheerio.load(html);
  $("script,style,noscript,svg,template").remove();

  const title = clean($("title").first().text());
  const description = clean(
    $('meta[name="description"]').attr("content") ?? "",
  );
  const body = clean($("body").text());
  const thin = body.length < THIN_TEXT_CHARS;
  const text = [title, description, body]
    .filter(Boolean)
    .join("\n")
    .slice(0, TEXT_CAP);

  const projects = countProjects($, finalUrl);
  const demo = hasLiveDemo($, finalUrl);
  const stack = MATCHERS.filter(([, re]) => re.test(text))
    .map(([name]) => name)
    .slice(0, 40);

  const cap = (c) => (thin ? Math.min(c, THIN_CONFIDENCE) : c);
  const rule = (confidence) => ({
    origin: "rule_based",
    confidence: cap(confidence),
  });

  const textEntry = ok("portfolio.text", text, { origin: "html_text" });
  if (thin)
    textEntry.note =
      "little server-rendered text; the site may be built in the browser (SPA)";

  return {
    "portfolio.is_reachable": ok("portfolio.is_reachable", true, {
      origin: "http_check",
    }),
    "portfolio.text": textEntry,
    "portfolio.project_count": ok(
      "portfolio.project_count",
      projects.value,
      rule(projects.confidence),
    ),
    "portfolio.has_live_demo": ok(
      "portfolio.has_live_demo",
      demo,
      rule(demo ? 0.75 : 0.6),
    ),
    "portfolio.tech_stack": ok(
      "portfolio.tech_stack",
      stack,
      rule(stack.length ? 0.7 : 0.6),
    ),
  };
}
