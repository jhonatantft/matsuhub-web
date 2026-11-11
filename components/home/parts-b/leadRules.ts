/**
 * Lead form rules shared by the contact form (client) and /api/lead (server).
 * Plain functions on purpose: the client bundle doesn't need zod.
 */

export const INTERESTS = ["Site", "Web app", "Agente de IA", "Automação"] as const;
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

/** pt-BR messages for the form. Empty object = valid. */
export function validateLead(f: LeadFields): LeadErrors {
  const e: LeadErrors = {};
  const name = f.name.trim();
  const contact = f.contact.trim();
  if (name.length < LIMITS.nameMin) e.name = "Diga como podemos te chamar.";
  else if (name.length > LIMITS.nameMax) e.name = `Use até ${LIMITS.nameMax} caracteres.`;
  if (!contact) e.contact = "Deixe um e-mail ou WhatsApp para respondermos.";
  else if (contact.length > LIMITS.contactMax || !isValidContact(contact))
    e.contact = "Informe um e-mail válido ou um WhatsApp com DDD.";
  if (f.message.length > LIMITS.messageMax) e.message = `A mensagem passou de ${LIMITS.messageMax} caracteres.`;
  return e;
}
