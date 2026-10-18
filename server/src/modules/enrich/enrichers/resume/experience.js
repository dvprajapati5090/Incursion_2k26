const MONTHS = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};
const SIDE = "(?:[A-Za-z]{3,9}\\.?\\s+|\\d{1,2}[\\/.-])?(?:19|20)\\d{2}";
const RANGE = new RegExp(
  `(${SIDE})\\s*(?:-|–|—|to)\\s*(present|current|ongoing|now|${SIDE})`,
  "gi",
);
const YEAR = /(?:19|20)\d{2}/;

// -> absolute month index (year * 12 + month). A year without a month is assumed to be mid-year.
function toIndex(side, asOfIdx) {
  if (/^(present|current|ongoing|now)$/i.test(side)) return asOfIdx;
  const year = Number(side.match(YEAR)[0]);
  const token = side
    .slice(0, side.search(YEAR))
    .trim()
    .replace(/[.\/-]$/, "");
  let month = 6;
  if (/^\d{1,2}$/.test(token)) month = Number(token);
  else if (token) month = MONTHS[token.slice(0, 3).toLowerCase()] ?? 6;
  return year * 12 + month;
}

export function experienceMonths(lines, asOfMs) {
  if (!lines) return { value: 0, confidence: 0.3 };

  const asOf = new Date(asOfMs);
  const asOfIdx = asOf.getUTCFullYear() * 12 + asOf.getUTCMonth() + 1;

  const spans = [];
  for (const line of lines) {
    for (const m of line.matchAll(RANGE)) {
      const start = toIndex(m[1], asOfIdx);
      const end = Math.min(toIndex(m[2], asOfIdx), asOfIdx); // never count the future
      if (start >= asOfIdx || end < start) continue;
      spans.push([start, Math.max(end, start + 1)]); // at least one month
    }
  }
  if (!spans.length) return { value: 0, confidence: 0.4 };

  // merge overlapping ranges so parallel roles are not double counted
  spans.sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [curStart, curEnd] = spans[0];
  for (const [s, e] of spans.slice(1)) {
    if (s <= curEnd) curEnd = Math.max(curEnd, e);
    else {
      total += curEnd - curStart;
      [curStart, curEnd] = [s, e];
    }
  }
  total += curEnd - curStart;
  return { value: total, confidence: 0.7 };
}
