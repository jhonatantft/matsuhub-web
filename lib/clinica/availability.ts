/**
 * Deterministic appointment availability for the "Elo" clinic demo.
 * The same professional + day + time is always free or always taken, on every device, so the
 * tour, the booking flow and Iris agree with each other. Nothing here reads the clock: callers
 * pass `now` (read it in an effect or a handler, never during render).
 */
import { ELO_OPEN, ELO_PROFESSIONALS, ELO_SPECIALTIES, type EloSpecialtyId } from "@/content/clinica";

export type EloSlot = {
  professionalId: string;
  specialty: EloSpecialtyId;
  /** Local start time. */
  start: Date;
  durationMin: number;
  free: boolean;
};

/** FNV-1a 32-bit. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const pad = (n: number) => String(n).padStart(2, "0");
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const timeLabel = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Share of slots already taken, by how many days ahead the day is (closer days are fuller). */
function occupancy(daysAhead: number): number {
  if (daysAhead <= 0) return 0.72;
  if (daysAhead === 1) return 0.62;
  if (daysAhead <= 4) return 0.45;
  return 0.28;
}

/** Slot grid for one professional on one day (empty when closed or not their day). */
export function slotsForDay(professionalId: string, day: Date, now: Date): EloSlot[] {
  const pro = ELO_PROFESSIONALS.find((p) => p.id === professionalId);
  if (!pro) return [];
  const spec = ELO_SPECIALTIES.find((s) => s.id === pro.specialty);
  const open = ELO_OPEN[day.getDay()];
  if (!spec || !open || !pro.days.includes(day.getDay())) return [];

  const step = spec.durationMin;
  const base = startOfDay(day);
  const daysAhead = Math.round((base.getTime() - startOfDay(now).getTime()) / 86_400_000);
  if (daysAhead < 0) return [];
  const busy = occupancy(daysAhead);
  const earliest = now.getTime() + 60 * 60_000; // bookable from one hour from now

  const slots: EloSlot[] = [];
  for (let min = open[0] * 60; min + step <= open[1] * 60; min += step) {
    const isLunch = day.getDay() !== 6 && min >= 12 * 60 && min < 13 * 60;
    if (isLunch) continue;
    const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), Math.floor(min / 60), min % 60);
    const taken = (hash(`${pro.id}|${dayKey(start)}|${timeLabel(start)}`) % 1000) / 1000 < busy;
    slots.push({
      professionalId: pro.id,
      specialty: pro.specialty,
      start,
      durationMin: step,
      free: !taken && start.getTime() >= earliest,
    });
  }
  return slots;
}

/** The next `count` free slots for a professional, searching up to `horizonDays` ahead. */
export function nextFreeForProfessional(professionalId: string, now: Date, count = 3, horizonDays = 21): EloSlot[] {
  const out: EloSlot[] = [];
  for (let d = 0; d <= horizonDays && out.length < count; d++) {
    for (const slot of slotsForDay(professionalId, addDays(now, d), now)) {
      if (slot.free) out.push(slot);
      if (out.length >= count) break;
    }
  }
  return out;
}

/** The next `count` free slots across every professional of a specialty, earliest first. */
export function nextFreeForSpecialty(specialty: EloSpecialtyId, now: Date, count = 3, horizonDays = 21): EloSlot[] {
  const pros = ELO_PROFESSIONALS.filter((p) => p.specialty === specialty);
  return pros
    .flatMap((p) => nextFreeForProfessional(p.id, now, count, horizonDays))
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, count);
}

/** Days with at least one free slot for a professional, for a month or week calendar. */
export function freeDays(professionalId: string, now: Date, horizonDays = 28): Date[] {
  const days: Date[] = [];
  for (let d = 0; d <= horizonDays; d++) {
    const day = addDays(now, d);
    if (slotsForDay(professionalId, day, now).some((s) => s.free)) days.push(startOfDay(day));
  }
  return days;
}

/* ---------------------------------------------------------------- by specialty ("primeiro horário disponível") */

/**
 * One day's grid for a whole specialty: the professionals of a specialty share the same step, so
 * their grids line up. A time is free when any of them is free; `professionalId` is the first one
 * free at that time (in ELO_PROFESSIONALS order), or the first one working it when all are taken.
 */
export function slotsForSpecialtyDay(specialty: EloSpecialtyId, day: Date, now: Date): EloSlot[] {
  const byTime = new Map<string, EloSlot>();
  for (const pro of ELO_PROFESSIONALS) {
    if (pro.specialty !== specialty) continue;
    for (const slot of slotsForDay(pro.id, day, now)) {
      const key = timeLabel(slot.start);
      const seen = byTime.get(key);
      if (!seen || (!seen.free && slot.free)) byTime.set(key, slot);
    }
  }
  return [...byTime.values()].sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** The grid the booking shows: one professional, or the whole specialty when none is chosen. */
export function slotsFor(specialty: EloSpecialtyId, professionalId: string | undefined, day: Date, now: Date): EloSlot[] {
  return professionalId ? slotsForDay(professionalId, day, now) : slotsForSpecialtyDay(specialty, day, now);
}

/** Days (start of day) from today to today + horizonDays with at least one free slot. */
export function freeDaysFor(specialty: EloSpecialtyId, professionalId: string | undefined, now: Date, horizonDays = 27): Date[] {
  const days: Date[] = [];
  for (let d = 0; d <= horizonDays; d++) {
    const day = addDays(now, d);
    if (slotsFor(specialty, professionalId, day, now).some((s) => s.free)) days.push(startOfDay(day));
  }
  return days;
}

/** The free slot that starts exactly at `start` (for that professional, or any of the specialty). */
export function findFreeSlot(specialty: EloSpecialtyId, professionalId: string | undefined, start: Date, now: Date): EloSlot | undefined {
  return slotsFor(specialty, professionalId, start, now).find((s) => s.free && s.start.getTime() === start.getTime());
}

/** "hoje", "amanhã" or "qui, 14/11". */
export function dayLabel(day: Date, now: Date): string {
  const diff = Math.round((startOfDay(day).getTime() - startOfDay(now).getTime()) / 86_400_000);
  if (diff === 0) return "hoje";
  if (diff === 1) return "amanhã";
  const wd = day.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  return `${wd}, ${pad(day.getDate())}/${pad(day.getMonth() + 1)}`;
}

/** "hoje, 15:20" · "amanhã, 07:00" · "qui, 14/11, 10:30" */
export function friendlySlot(slot: { start: Date }, now: Date): string {
  return `${dayLabel(slot.start, now)}, ${timeLabel(slot.start)}`;
}

/** "quinta-feira, 14 de novembro" */
export function longDay(day: Date): string {
  return day.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

/** "qua, 14/11 · 10:30" */
export function slotLabel(slot: { start: Date }): string {
  const wd = slot.start.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  return `${wd}, ${pad(slot.start.getDate())}/${pad(slot.start.getMonth() + 1)} · ${timeLabel(slot.start)}`;
}

/**
 * An iCalendar file for one appointment (floating local time, like a calendar invite typed by
 * hand). Build it in a handler and download it with a Blob URL.
 */
export function toIcs(opts: { uid: string; start: Date; durationMin: number; summary: string; location: string; description: string; stamp: Date }): string {
  const fmt = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  // DTSTAMP must be UTC (RFC 5545 §3.8.7.2)
  const utc = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  const end = new Date(opts.start.getTime() + opts.durationMin * 60_000);
  const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MatsuHub//Elo demo//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${opts.uid}`,
    `DTSTAMP:${utc(opts.stamp)}`,
    `DTSTART:${fmt(opts.start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(opts.summary)}`,
    `LOCATION:${esc(opts.location)}`,
    `DESCRIPTION:${esc(opts.description)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT24H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(opts.summary)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ]
    .map(fold)
    .join("\r\n");
}

/** RFC 5545 §3.1: lines longer than 75 octets continue on the next line after CRLF + space. */
function fold(line: string): string {
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const cp = ch.codePointAt(0)!;
    const size = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
    if (bytes + size > (out.length === 0 ? 75 : 74)) {
      out.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += size;
  }
  out.push(cur);
  return out.join("\r\n ");
}
