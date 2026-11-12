/**
 * Lead form rules shared by the contact form (client) and /api/lead (server).
 * Plain functions on purpose: the client bundle doesn't need zod.
 * Validation yields error codes; each form shows them in its own language (LEAD_MESSAGES), and the
 * MatsuHub form maps the API's error codes (429, 422 fields) to the same messages.
 */

import type { Lang, Localized } from "@/lib/i18n/core";

export type LeadErrorCode = "nameMin" | "nameMax" | "contactEmpty" | "contactInvalid" | "messageMax";
type LeadMessages = Record<LeadErrorCode | "rateLimited" | "failed", string>;

/** Every message the lead forms show, per language. `{n}` = the limit. */
export const LEAD_MESSAGES: Localized<LeadMessages> = {
  pt: {
    nameMin: "Diga como podemos te chamar.",
    nameMax: "Use até {n} caracteres.",
    contactEmpty: "Deixe um e-mail ou WhatsApp para respondermos.",
    contactInvalid: "Informe um e-mail válido ou um WhatsApp com DDD.",
    messageMax: "A mensagem passou de {n} caracteres.",
    rateLimited: "Muitas tentativas seguidas. Tente de novo em alguns minutos.",
    failed: "Não conseguimos enviar agora. Tente de novo em instantes — ou fale com a gente pelo WhatsApp.",
  },
  en: {
    nameMin: "Tell us what to call you.",
    nameMax: "Use up to {n} characters.",
    contactEmpty: "Leave an email or WhatsApp number so we can reply.",
    contactInvalid: "Enter a valid email or a full WhatsApp number, with country code.",
    messageMax: "Your message is over {n} characters.",
    rateLimited: "Too many attempts in a row. Please try again in a few minutes.",
    failed: "We couldn't send it just now. Try again in a moment — or reach us on WhatsApp.",
  },
};

/** Shown by every lead form when /api/lead answers 429 (also sent in the 429 body). */
export const RATE_LIMITED_MESSAGE = LEAD_MESSAGES.pt.rateLimited;

/**
 * Milliseconds since `startedAt` (a performance.now() mark, 0 = never started), sent as the
 * payload's `elapsedMs`. Call it in the submit handler only, never during render.
 */
export const elapsedSince = (startedAt: number) => (startedAt > 0 ? Math.round(performance.now() - startedAt) : 0);

export const INTERESTS =["Site", "Web app", "Agente de IA", "Automação"] as const;
export type Interest = (typeof INTERESTS)[number];

export const LIMITS = {
  nameMin: 2,
  nameMax: 120,
  contactMin: 5,
  contactMax: 160,
  messageMax: 2000,
  interestsMax: 6,
} as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isEmail = (v: string) => EMAIL.test(v.trim());

/** A phone number: only digits, spaces and + ( ) - . and at least 8 digits. */
export const isPhone = (v: string) => /^[\d\s+().-]+$/.test(v.trim()) && v.replace(/\D/g, "").length >= 8;

export const isValidContact = (v: string) => isEmail(v) || isPhone(v);

export type LeadFields = { name: string; contact: string; message: string };
export type LeadErrors = Partial<Record<keyof LeadFields, string>>;
export type LeadErrorCodes = Partial<Record<keyof LeadFields, LeadErrorCode>>;

/** Error codes per field. Empty object = valid. */
export function leadErrorCodes(f: LeadFields): LeadErrorCodes {
  const e: LeadErrorCodes = {};
  const name = f.name.trim();
  const contact = f.contact.trim();
  if (name.length < LIMITS.nameMin) e.name = "nameMin";
  else if (name.length > LIMITS.nameMax) e.name = "nameMax";
  if (!contact) e.contact = "contactEmpty";
  else if (contact.length > LIMITS.contactMax || !isValidContact(contact)) e.contact = "contactInvalid";
  if (f.message.length > LIMITS.messageMax) e.message = "messageMax";
  return e;
}

const LIMIT_OF: Record<LeadErrorCode, number> = {
  nameMin: LIMITS.nameMin,
  nameMax: LIMITS.nameMax,
  contactEmpty: 0,
  contactInvalid: 0,
  messageMax: LIMITS.messageMax,
};

/** One error code as text in `lang`. */
export const leadMessage = (code: LeadErrorCode, lang: Lang) => LEAD_MESSAGES[lang][code].replace("{n}", String(LIMIT_OF[code]));

/** Codes → messages in `lang`. */
export function localizeLeadErrors(codes: LeadErrorCodes, lang: Lang): LeadErrors {
  const e: LeadErrors = {};
  for (const key of Object.keys(codes) as (keyof LeadFields)[]) {
    const code = codes[key];
    if (code) e[key] = leadMessage(code, lang);
  }
  return e;
}

/** Validation messages in `lang` (pt-BR by default, for the demos' forms). Empty object = valid. */
export function validateLead(f: LeadFields, lang: Lang = "pt"): LeadErrors {
  return localizeLeadErrors(leadErrorCodes(f), lang);
}
