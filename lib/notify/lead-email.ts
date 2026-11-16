/**
 * New-lead e-mail through Resend's HTTP API (no SDK). Server only.
 *
 *   RESEND_API_KEY    resend.com → API Keys.
 *   LEAD_NOTIFY_TO    who receives it; several addresses separated by commas.
 *   LEAD_NOTIFY_FROM  optional. Defaults to Resend's test sender, which only delivers to the
 *                     e-mail of the Resend account itself; set "MatsuHub <leads@matsuhub.com>"
 *                     once the domain is verified in Resend.
 *
 * Never throws: answers whether the e-mail was accepted. Logs the status only, no lead data.
 */

export type LeadMail = {
  source: string;
  name: string;
  contact: string;
  interests: string[] | null;
  interest: string | null;
  message: string | null;
  referer: string | null;
};

const SOURCE_LABEL: Record<string, string> = {
  site: "site",
  "demo-imobiliaria": "demo imobiliária",
  "demo-restaurante": "demo restaurante",
  "demo-clinica": "demo clínica",
};

const recipients = () =>
  (process.env.LEAD_NOTIFY_TO ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export const leadEmailConfigured = () => Boolean(process.env.RESEND_API_KEY) && recipients().length > 0;

/** A Brazilian number without country code gets 55; anything that already looks international is kept. */
function whatsappLink(contact: string): string | null {
  if (contact.includes("@")) return null;
  const digits = contact.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`;
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function leadEmail(lead: LeadMail) {
  const origin = SOURCE_LABEL[lead.source] ?? lead.source;
  const wa = whatsappLink(lead.contact);
  const interest = lead.interests?.length ? lead.interests.join(", ") : lead.interest;
  const rows: [string, string][] = [
    ["Nome", lead.name],
    ["Contato", lead.contact],
    ...(wa ? ([["WhatsApp", wa]] as [string, string][]) : []),
    ...(interest ? ([["Interesse", interest]] as [string, string][]) : []),
    ["Origem", lead.referer ? `${origin} · ${lead.referer}` : origin],
  ];
  const message = lead.message?.trim() || "(sem mensagem)";

  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nMensagem:\n${message}\n`;
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#111">
<table style="border-collapse:collapse">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 16px 4px 0;color:#666;vertical-align:top">${k}</td><td style="padding:4px 0">${
          /^https?:\/\//.test(v) ? `<a href="${escape(v)}">${escape(v)}</a>` : escape(v)
        }</td></tr>`,
    )
    .join("")}</table>
<p style="margin:20px 0 6px;color:#666">Mensagem</p>
<p style="margin:0;white-space:pre-wrap">${escape(message)}</p>
</div>`;

  return {
    subject: `Novo lead (${origin}): ${lead.name}`,
    text,
    html,
    replyTo: lead.contact.includes("@") ? lead.contact : undefined,
  };
}

export async function sendLeadEmail(lead: LeadMail): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const to = recipients();
  if (!key || !to.length) return false;
  const mail = leadEmail(lead);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: process.env.LEAD_NOTIFY_FROM || "MatsuHub <onboarding@resend.dev>",
        to,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error("[lead-email] Resend respondeu", res.status, (await res.text()).slice(0, 200));
    return res.ok;
  } catch (err) {
    console.error("[lead-email] envio falhou:", err instanceof Error ? err.name : "error");
    return false;
  }
}
