/**
 * Escape untrusted text before interpolating it into an HTML email body.
 * Every dynamic value in every template MUST pass through this.
 */
export const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Only allow http(s) URLs in hrefs (blocks javascript: and friends). */
export const safeUrl = (url: string): string => {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "#";
  } catch {
    return "#";
  }
};
