import { escapeHtml, safeUrl } from "./html";

export interface RenderedEmail {
  subject: string;
  html: string;
}

export const button = (label: string, href: string): string =>
  `<p style="margin:24px 0;"><a href="${escapeHtml(safeUrl(href))}" style="background:#111827;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;">${escapeHtml(label)}</a></p>`;

/** Shared wrapper. `bodyHtml` must already be escaped / built from escaped parts. */
export const layout = (title: string, bodyHtml: string): string => `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111827;">
  <h2 style="font-size:20px;margin-bottom:16px;">${escapeHtml(title)}</h2>
  ${bodyHtml}
  <p>Med vänliga hälsningar,<br/>Industrin.net-teamet</p>
</div>`.trim();
