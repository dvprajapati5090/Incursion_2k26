const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Indian mobile numbers, or 10-digit numbers with optional country code. Best effort.
const PHONE =
  /(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)|(?<!\d)(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/g;

export function redactPii(text) {
  return text.replace(EMAIL, "[EMAIL]").replace(PHONE, "[PHONE]");
}
