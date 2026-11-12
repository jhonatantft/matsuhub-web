import { ELO, eloProfessional, type EloMode, type EloSpecialty } from "@/content/clinica";
import { timeLabel, toIcs } from "@/lib/clinica/availability";

/** Pure helpers of the booking flow (no React, no clock reads). */

const pad = (n: number) => String(n).padStart(2, "0");
export const brDate = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
export const modeLabel = (mode: EloMode) => (mode === "teleconsulta" ? "Teleconsulta (por vídeo)" : "Presencial");

/** The lead's `interest`: "<especialidade> · <profissional> · <dia> <hora> · presencial|teleconsulta". */
export function interestLine(spec: EloSpecialty, professionalId: string, start: Date, mode: EloMode): string {
  const pro = eloProfessional(professionalId)?.name ?? "Primeiro disponível";
  return `${spec.name} · ${pro} · ${brDate(start)} ${timeLabel(start)} · ${mode}`;
}

/** WhatsApp digits only, with DDD: 10 or 11 digits, optionally +55 in front. */
export function isBrWhatsApp(raw: string): boolean {
  if (!/^[\d\s+().-]+$/.test(raw.trim())) return false;
  const digits = raw.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  return digits.length === 10 || digits.length === 11;
}

/** "O que levar": the specialty's list plus what follows from the patient's answers. */
export function whatToBring(spec: EloSpecialty, mode: EloMode, pay: "particular" | "convenio" | "", first: "sim" | "nao" | ""): string[] {
  const list: string[] = [...spec.prepare];
  if (pay === "convenio") list.push("Carteirinha do convênio");
  if (mode === "teleconsulta") list.push("Celular ou computador com câmera, num lugar reservado");
  else if (first === "sim") list.push("Chegue 15 minutos antes para fazer o cadastro");
  return list;
}

/** A unique id for the .ics event (handlers only). */
export const newUid = (stamp: Date) => `${stamp.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}@${ELO.domain}`;

/** The .ics text for a booked appointment (call from a handler: it reads `stamp`). */
export function bookingIcs(opts: {
  spec: EloSpecialty;
  professionalId: string;
  start: Date;
  mode: EloMode;
  bring: string[];
  uid: string;
  stamp: Date;
}): string {
  const pro = eloProfessional(opts.professionalId)?.name ?? "";
  const kind = opts.spec.id === "ultrassom" || opts.spec.id === "coleta" ? opts.spec.name : `Consulta de ${opts.spec.name.toLowerCase()}`;
  return toIcs({
    uid: opts.uid,
    start: opts.start,
    durationMin: opts.spec.durationMin,
    summary: `${kind} · ${ELO.full}`,
    location: opts.mode === "teleconsulta" ? "Teleconsulta (o link chega pelo WhatsApp)" : ELO.address,
    description: [
      `Com ${pro}.`,
      `Modalidade: ${modeLabel(opts.mode)}.`,
      `O que levar: ${opts.bring.join("; ")}.`,
      "Site-demo MatsuHub: clínica e agendamento fictícios.",
    ].join("\n"),
    stamp: opts.stamp,
  });
}
