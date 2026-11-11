"use client";

import { MARE_TABLES, MARE_ZONES, type MareTable, type MareZoneId } from "@/content/mare";
import { cn } from "@/lib/cn";
import {
  PARTY_SIZES,
  SLOTS,
  freeSlots,
  isZoneItem,
  partyLabel,
  statusOf,
  tableById,
  zoneById,
  type ItemId,
  type Slot,
} from "./data";

/** Presentational pieces of the Maré tour (cards, control strip, view bar). No state here. */

export const eyebrow = "text-[10px] leading-none font-semibold tracking-[0.24em] uppercase";

export function statusText(table: MareTable, party: number, slot: Slot) {
  const status = statusOf(table, party, slot);
  if (status === "livre") return { tone: "ok" as const, text: `Livre às ${slot}` };
  if (status === "ocupada") {
    const other = freeSlots(table.id).filter((s) => s !== slot);
    return {
      tone: "busy" as const,
      text: other.length ? `Ocupada às ${slot} · livre às ${other.join(" e ")}` : `Lotada nesta noite`,
    };
  }
  if (table.id === "C1") return { tone: "no" as const, text: "Reservada a grupos a partir de 6" };
  if (party > table.seats) return { tone: "no" as const, text: `Pequena para ${partyLabel(party)}` };
  return { tone: "no" as const, text: `Grande demais para ${partyLabel(party)}` };
}

function Dot({ tone }: { tone: "ok" | "busy" | "no" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-1.5 shrink-0 rounded-full",
        tone === "ok" && "bg-ma-ember shadow-[0_0_10px_2px_rgb(240_138_75/0.55)]",
        tone === "busy" && "bg-ma-mute/70",
        tone === "no" && "border border-ma-mute/60",
      )}
    />
  );
}

/** The body of a card: a table (seats, availability, note) or a zone. */
export function ItemBody({ id, party, slot, large = false }: { id: ItemId; party: number; slot: Slot; large?: boolean }) {
  if (isZoneItem(id)) {
    const zone = zoneById(id.slice(5) as MareZoneId);
    const tables = MARE_TABLES.filter((t) => t.zone === zone.id);
    const free = tables.filter((t) => statusOf(t, party, slot) === "livre").length;
    return (
      <>
        <p className={cn(eyebrow, "text-ma-ember")}>Ambiente</p>
        <h3 className={cn("mt-2 font-mare leading-[1.02] text-ma-ink italic", large ? "text-[34px]" : "text-[26px]")}>
          {zone.name}
        </h3>
        <p className="mt-2 text-[13px] leading-snug text-ma-mute">{zone.note}</p>
        <p className="mt-3 flex items-center gap-2 text-[12px] text-ma-ink/90">
          <Dot tone={zone.bookable ? (free ? "ok" : "busy") : "no"} />
          {zone.bookable
            ? free
              ? `${free} de ${tables.length} ${tables.length === 1 ? "lugar livre" : "mesas livres"} às ${slot} para ${partyLabel(party)}`
              : `Nada livre às ${slot} para ${partyLabel(party)}`
            : "Sem reserva · é chegar e aproveitar"}
        </p>
      </>
    );
  }
  const table = tableById(id)!;
  const zone = zoneById(table.zone);
  const status = statusText(table, party, slot);
  return (
    <>
      <p className={cn(eyebrow, "text-ma-ember")}>{zone.name}</p>
      <h3 className={cn("mt-2 font-mare leading-[1.02] text-ma-ink italic", large ? "text-[34px]" : "text-[26px]")}>
        {table.label}
      </h3>
      <p className="mt-2 text-[12px] tracking-wide text-ma-mute">
        {table.id === "B1" ? "6 banquetas no balcão" : `${table.seats} lugares`}
      </p>
      <p className="mt-2.5 flex items-center gap-2 text-[12.5px] text-ma-ink/90">
        <Dot tone={status.tone} />
        {status.text}
      </p>
      {table.note && <p className="mt-2.5 font-mare text-[16px] leading-snug text-ma-ink/80 italic">“{table.note}”</p>}
    </>
  );
}

export const btn =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[11px] leading-none font-semibold tracking-[0.18em] uppercase transition-colors duration-300 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ma-ember disabled:cursor-not-allowed disabled:opacity-40";
export const btnPrimary = cn(btn, "bg-ma-ember text-ma-bg hover:bg-ma-ink");
export const btnGhost = cn(btn, "border border-ma-line text-ma-ink hover:border-ma-ember/70 hover:text-ma-ember");

export const glass = "border border-ma-line bg-ma-bg/78 backdrop-blur-md";

function Segment<T extends string | number>({
  label,
  options,
  value,
  onChange,
  format,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  format?: (value: T) => string;
}) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-2.5">
      <span className={cn(eyebrow, "text-ma-mute")}>{label}</span>
      <div className="flex">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={option === value}
            onClick={() => onChange(option)}
            className="min-w-9 px-2.5 py-2 text-[12px] leading-none text-ma-ink/80 tabular-nums transition-colors duration-300 hover:text-ma-ember focus-visible:outline-1 focus-visible:outline-ma-ember aria-pressed:bg-ma-ember aria-pressed:text-ma-bg"
          >
            {format ? format(option) : option}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Party size + time slot, and how many tables that leaves. */
export function ControlStrip({
  party,
  slot,
  onParty,
  onSlot,
  onExit,
  className,
}: {
  party: number;
  slot: Slot;
  onParty: (n: number) => void;
  onSlot: (s: Slot) => void;
  onExit: () => void;
  className?: string;
}) {
  const free = MARE_TABLES.filter((t) => statusOf(t, party, slot) === "livre").length;
  return (
    <div className={cn(glass, "flex items-center gap-x-5 gap-y-2 px-3 py-2 @max-3xl:flex-wrap @max-3xl:justify-center", className)}>
      <button
        type="button"
        onClick={onExit}
        className="flex items-center gap-2 px-1 py-2 text-[11px] tracking-[0.16em] text-ma-mute uppercase transition-colors hover:text-ma-ember focus-visible:outline-1 focus-visible:outline-ma-ember @max-3xl:hidden"
      >
        <span aria-hidden>←</span> Entrada
      </button>
      <span aria-hidden className="h-5 w-px bg-ma-line @max-3xl:hidden" />
      <Segment label="Pessoas" options={PARTY_SIZES} value={party as (typeof PARTY_SIZES)[number]} onChange={onParty} />
      <span aria-hidden className="h-5 w-px bg-ma-line @max-3xl:hidden" />
      <Segment label="Horário" options={SLOTS} value={slot} onChange={onSlot} />
      <span aria-hidden className="h-5 w-px bg-ma-line @max-3xl:hidden" />
      <p aria-live="polite" className="flex items-center gap-2 text-[12px] whitespace-nowrap text-ma-ink/90">
        <Dot tone={free ? "ok" : "busy"} />
        {free ? `${free} ${free === 1 ? "mesa livre" : "mesas livres"}` : "Nenhuma mesa livre"}
      </p>
    </div>
  );
}

/** The six zones of a view + the way back to the cut-away. */
export function ViewBar({
  zone,
  onZone,
  onBack,
  className,
}: {
  zone: MareZoneId;
  onZone: (zone: MareZoneId) => void;
  onBack: () => void;
  className?: string;
}) {
  return (
    <div className={cn(glass, "flex items-center gap-1 p-1.5 @max-3xl:flex-col @max-3xl:items-stretch", className)}>
      <div role="group" aria-label="Ambientes" className="flex @max-3xl:grid @max-3xl:grid-cols-3">
        {MARE_ZONES.map((z) => (
          <button
            key={z.id}
            type="button"
            aria-pressed={z.id === zone}
            onClick={() => onZone(z.id)}
            className="px-3 py-2.5 text-[11.5px] leading-none whitespace-nowrap text-ma-ink/75 transition-colors duration-300 hover:text-ma-ember focus-visible:outline-1 focus-visible:outline-ma-ember aria-pressed:text-ma-ember aria-pressed:shadow-[inset_0_-1px_0_0_var(--color-ma-ember)]"
          >
            {z.name}
          </button>
        ))}
      </div>
      <span aria-hidden className="mx-1 h-6 w-px bg-ma-line @max-3xl:hidden" />
      <button type="button" onClick={onBack} className={cn(btnGhost, "border-ma-ember/50 whitespace-nowrap")}>
        <span aria-hidden>↺</span> Voltar ao salão
      </button>
    </div>
  );
}
