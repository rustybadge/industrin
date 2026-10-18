import { escapeHtml as e } from "./html";
import { button, layout, type RenderedEmail } from "./layout";

const field = (label: string, value: unknown) =>
  `<p><strong>${e(label)}:</strong> ${e(value || "–")}</p>`;

/** Admin notification: a new ownership claim arrived. */
export function claimReceivedAdmin(p: {
  companyName: string;
  claimantName: string;
  claimantEmail: string;
  phone?: string | null;
  message?: string | null;
  adminUrl: string;
}): RenderedEmail {
  return {
    subject: `Ny ägaransökan: ${p.companyName}`,
    html: layout(
      "Ny ägaransökan inkom",
      [
        field("Företag", p.companyName),
        field("Namn", p.claimantName),
        field("E-post", p.claimantEmail),
        field("Telefon", p.phone),
        field("Meddelande", p.message),
        button("Granska ansökan i admin", p.adminUrl),
      ].join("\n"),
    ),
  };
}

/** Confirmation to the claimant that we received the claim. */
export function claimConfirmation(p: { name: string; companyName: string }): RenderedEmail {
  return {
    subject: `Vi har tagit emot din ägaransökan för ${p.companyName}`,
    html: layout(
      "Tack för din ansökan",
      `<p>Hej ${e(p.name)},</p>
       <p>Vi har tagit emot din ansökan om att få hantera profilen för <strong>${e(p.companyName)}</strong> på Industrin.net.</p>
       <p>Vi granskar ansökan och återkommer via e-post så snart den är behandlad.</p>`,
    ),
  };
}

export function claimApproved(p: { name: string; companyName: string; portalUrl: string }): RenderedEmail {
  return {
    subject: `Din ägaransökan för ${p.companyName} har godkänts`,
    html: layout(
      "Din ägaransökan har godkänts",
      `<p>Hej ${e(p.name)},</p>
       <p>Vi har granskat din ansökan och godkänt dig som ägare av <strong>${e(p.companyName)}</strong> på Industrin.net.</p>
       <p>Du kommer inom kort att få ett <strong>separat inbjudningsmail</strong> från vårt system. Acceptera inbjudan så kommer du direkt till företagsportalen där du kan hantera er profil.</p>
       <p>Har du redan ett konto kan du logga in direkt här:</p>
       ${button("Logga in på företagsportalen", p.portalUrl)}
       <p>Hör av dig om du har några frågor.</p>`,
    ),
  };
}

export function claimRejected(p: { name: string; companyName: string; supportEmail?: string }): RenderedEmail {
  const support = p.supportEmail ?? "kontakt@industrin.net";
  return {
    subject: `Angående din ägaransökan för ${p.companyName}`,
    html: layout(
      "Angående din ägaransökan",
      `<p>Hej ${e(p.name)},</p>
       <p>Tack för att du skickade in en ägaransökan för <strong>${e(p.companyName)}</strong> på Industrin.net.</p>
       <p>Efter granskning kan vi tyvärr inte godkänna ansökan vid detta tillfälle.</p>
       <p>Har du frågor eller vill lämna mer information är du välkommen att kontakta oss på <a href="mailto:${e(support)}">${e(support)}</a>.</p>`,
    ),
  };
}

/** Sent once, when the owner accepts the Clerk invitation and is linked. */
export function ownerWelcome(p: { name: string; companyName: string; portalUrl: string }): RenderedEmail {
  return {
    subject: `Välkommen till företagsportalen – ${p.companyName}`,
    html: layout(
      "Välkommen till Industrin.net",
      `<p>Hej ${e(p.name)},</p>
       <p>Ditt konto är nu kopplat till <strong>${e(p.companyName)}</strong>. Du kan nu uppdatera företagets beskrivning, tjänster och kontaktuppgifter.</p>
       ${button("Öppna företagsportalen", p.portalUrl)}`,
    ),
  };
}

/** Notifies a service company that a matching request came in. */
export function serviceRequestNotification(p: {
  companyName: string;
  serviceType: string;
  urgency: string;
  location: string;
  description: string;
  dashboardUrl: string;
}): RenderedEmail {
  const urgencyLabel: Record<string, string> = {
    akut: 'Akut – behövs omgående',
    'inom-veckan': 'Inom veckan',
    planerad: 'Planerat',
  };
  return {
    subject: `Ny förfrågan på Industrin – ${e(p.serviceType)}, ${e(p.location)}`,
    html: layout(
      'Ny serviceförfrågan',
      [
        `<p>Hej ${e(p.companyName)},</p>`,
        `<p>En ny förfrågan som matchar ert område har kommit in på Industrin.net.</p>`,
        field('Tjänst', p.serviceType),
        field('Ort', p.location),
        field('Prioritet', urgencyLabel[p.urgency] ?? p.urgency),
        field('Beskrivning', p.description),
        `<p>Logga in på ert konto för att se hela förfrågan och svara köparen direkt.</p>`,
        button('Svara på förfrågan', p.dashboardUrl),
      ].join('\n'),
    ),
  };
}

/** Notifies the buyer that a company has responded to their request. */
export function serviceRequestResponse(p: {
  buyerName: string;
  companyName: string;
  responseMessage: string;
  serviceType: string;
}): RenderedEmail {
  return {
    subject: `${e(p.companyName)} har svarat på din förfrågan`,
    html: layout(
      'Svar på din serviceförfrågan',
      `<p>Hej ${e(p.buyerName)},</p>
       <p><strong>${e(p.companyName)}</strong> har svarat på din förfrågan om ${e(p.serviceType)} på Industrin.net.</p>
       <blockquote style="border-left:3px solid #e5e7eb;margin:16px 0;padding:12px 16px;color:#374151;">
         ${e(p.responseMessage)}
       </blockquote>
       <p>Kontakta företaget direkt för att komma vidare.</p>`,
    ),
  };
}
