"use client";

import type { EloSpecialtyId } from "@/content/clinica";
import { addDays, dayKey, longDay, slotsFor, startOfDay, timeLabel } from "@/lib/clinica/availability";
import { cn } from "@/lib/cn";

const WEEK = ["D", "S", "T", "Q", "Q", "S", "S"];
const WEEK_LONG = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
export const HORIZON_DAYS = 27;

/** Free slots per day (yyyy-mm-dd → count) for the next four weeks; past times don't count. */
export function freeCounts(specialty: EloSpecialtyId, professionalId: string | undefined, now: Date): Map<string, number> {
  const counts = new Map<string, number>();
  for (let d = 0; d <= HORIZON_DAYS; d++) {
    const day = addDays(now, d);
    const n = slotsFor(specialty, professionalId, day, now).filter((s) => s.free).length;
    if (n > 0) counts.set(dayKey(day), n);
  }
  return counts;
}

const parseDay = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/**
 * The next four weeks as a month-style grid (Sunday first). Days with free slots are buttons;
 * the rest (closed, not that professional's day, full, or outside the four weeks) are disabled.
 */
export function BookingCalendar({
  now,
  counts,
  selected,
  onSelect,
}: {
  now: Date;
  counts: Map<string, number>;
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  const today = startOfDay(now);
  const last = addDays(today, HORIZON_DAYS);
  const first = addDays(today, -today.getDay());
  const end = addDays(last, 6 - last.getDay());
  const cells: Date[] = [];
  for (let d = first; d.getTime() <= end.getTime(); d = addDays(d, 1)) cells.push(d);

  const months = [today, last]
    .map((d) => d.toLocaleDateString("pt-BR", { month: "long" }))
    .filter((m, i, all) => all.indexOf(m) === i);
  const title = `${months.join(" e ")} de ${last.getFullYear()}`;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
        <p className="font-elo text-[16.5px] text-el-ink first-letter:uppercase">{title}</p>
        <p className="text-[13.5px] text-el-mute">próximas 4 semanas</p>
      </div>
      <div aria-hidden className="mt-3 grid grid-cols-7 gap-1.5 text-center font-elo text-[12.5px] text-el-mute">
        {WEEK.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
      <ul aria-label="Dias" className="mt-1.5 grid grid-cols-7 gap-1.5">
        {cells.map((d, i) => {
          const key = dayKey(d);
          const inRange = d.getTime() >= today.getTime() && d.getTime() <= last.getTime();
          const n = inRange ? (counts.get(key) ?? 0) : 0;
          const on = selected === key;
          const isToday = key === dayKey(today);
          const newMonth = i === 0 || d.getDate() === 1;
          return (
            <li key={key}>
              <button
                type="button"
                disabled={n === 0}
                aria-pressed={on}
                aria-label={`${longDay(d)}${isToday ? ", hoje" : ""}: ${n === 0 ? (inRange ? "sem horário livre" : "fora do período") : `${n} ${n === 1 ? "horário livre" : "horários livres"}`}`}
                onClick={() => onSelect(key)}
                className={cn(
                  "relative flex h-12 w-full flex-col items-center justify-center rounded-[12px] pt-1 font-elo text-[15.5px] leading-none tabular-nums transition-colors sm:h-14 sm:text-[16.5px]",
                  isToday && !on && "ring-2 ring-el-acc-2/70 ring-inset",
                  n === 0 && (inRange ? "text-el-ink/35" : "text-el-ink/20"),
                  n > 0 && !on && "border border-el-ink/12 bg-el-bg-2 text-el-ink hover:border-el-acc hover:bg-el-acc/[0.05]",
                  on && "bg-el-acc text-white shadow-[0_10px_24px_-12px_rgb(15_92_87/0.8)]",
                )}
              >
                {(isToday || (newMonth && inRange)) && (
                  <span className={cn("absolute top-[3px] text-[9px] tracking-[0.04em] uppercase", on ? "text-white/85" : "text-el-mute")}>
                    {isToday ? "hoje" : d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                  </span>
                )}
                {d.getDate()}
                {n > 0 && (
                  <i aria-hidden className={cn("mt-1 h-1 w-1 rounded-full", on ? "bg-white" : "bg-el-acc/60")} />
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-el-mute">
        <span className="flex items-center gap-2">
          <i aria-hidden className="h-1.5 w-1.5 rounded-full bg-el-acc/60" /> dia com horário livre
        </span>
      </p>
    </div>
  );
}

/** The chosen day's grid: free times are buttons, taken times stay visible and struck through. */
export function TimeGrid({
  now,
  specialty,
  professionalId,
  day,
  selected,
  onSelect,
}: {
  now: Date;
  specialty: EloSpecialtyId;
  professionalId?: string;
  day: string;
  selected: number | null;
  onSelect: (ms: number) => void;
}) {
  const date = parseDay(day);
  const earliest = now.getTime() + 60 * 60_000;
  const slots = slotsFor(specialty, professionalId, date, now).filter((s) => s.start.getTime() >= earliest);
  const groups = [
    { label: "Manhã", slots: slots.filter((s) => s.start.getHours() < 12) },
    { label: "Tarde", slots: slots.filter((s) => s.start.getHours() >= 12) },
  ].filter((g) => g.slots.length > 0);

  return (
    <div className="mt-6 border-t border-el-line pt-5">
      <p className="font-elo text-[16.5px] text-el-ink">
        <span className="first-letter:uppercase">{WEEK_LONG[date.getDay()]}</span>, {date.getDate()}/{String(date.getMonth() + 1).padStart(2, "0")}
      </p>
      {groups.map((g) => (
        <div key={g.label} className="mt-4">
          <p className="text-[13.5px] text-el-mute">{g.label}</p>
          <ul className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
            {g.slots.map((s) => {
              const ms = s.start.getTime();
              const on = selected === ms;
              const t = timeLabel(s.start);
              return (
                <li key={ms}>
                  <button
                    type="button"
                    disabled={!s.free}
                    aria-pressed={s.free ? on : undefined}
                    aria-label={s.free ? t : `${t}, ocupado`}
                    onClick={() => onSelect(ms)}
                    className={cn(
                      "w-full rounded-[12px] py-3 font-elo text-[15.5px] leading-none tabular-nums transition-colors",
                      !s.free && "bg-el-ink/[0.04] text-el-ink/40 line-through decoration-el-ink/30",
                      s.free && !on && "border border-el-acc/30 bg-el-bg-2 text-el-acc hover:border-el-acc hover:bg-el-acc/[0.06]",
                      on && "bg-el-acc text-white",
                    )}
                  >
                    {t}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-el-mute">
        <span className="flex items-center gap-2">
          <i aria-hidden className="h-3 w-5 rounded-[4px] border border-el-acc/40 bg-el-bg-2" /> livre
        </span>
        <span className="flex items-center gap-2">
          <i aria-hidden className="h-3 w-5 rounded-[4px] bg-el-ink/[0.06]" /> ocupado
        </span>
      </p>
    </div>
  );
}
