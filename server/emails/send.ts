import { Resend } from "resend";
import type { RenderedEmail } from "./layout";

export interface Mailer {
  send(to: string, email: RenderedEmail): Promise<boolean>;
}

const FROM = process.env.EMAIL_FROM ?? "Industrin.net <noreply@industrin.net>";

/**
 * Resend-backed mailer. Never throws: email is a side effect and must not roll
 * back or fail the business operation that triggered it. No-op without RESEND_API_KEY.
 */
export function createResendMailer(apiKey = process.env.RESEND_API_KEY): Mailer {
  const client = apiKey ? new Resend(apiKey) : null;
  return {
    async send(to, email) {
      if (!client) {
        console.warn(`[email] RESEND_API_KEY not set; skipped "${email.subject}"`);
        return false;
      }
      try {
        const { error } = await client.emails.send({ from: FROM, to, subject: email.subject, html: email.html });
        if (error) {
          console.warn(`[email] Resend rejected "${email.subject}":`, error);
          return false;
        }
        return true;
      } catch (err) {
        console.warn(`[email] send failed "${email.subject}":`, err);
        return false;
      }
    },
  };
}
