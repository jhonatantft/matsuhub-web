"use client";

import { useState } from "react";
import {
  AURORA,
  AURORA_STATUS_LABEL,
  AURORA_TYPES,
  AURORA_UNITS,
  brl,
  type AuroraStatus,
  type AuroraUnit,
} from "@/content/aurora";
import { cn } from "@/lib/cn";
import { emitSite, scrollToSection, SECTION } from "./bus";
import { SiteHeading, SiteSection } from "./SiteSection";

type TypeFilter = "all" | keyof typeof AURORA_TYPES;
type FloorFilter = "all" | "low" | "mid" | "high";
type StatusFilter = "all" | AuroraStatus;

const FLOOR_RANGES: Record<Exclude<FloorFilter, "all">, [number, number, string]> = {
  high: [15, 21, "15º–21º"],
  mid: [8, 14, "8º–14º"],
  low: [1, 7, "1º–7º"],
};

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "A", label: "A · 3 suítes" },
  { value: "B", label: "B · 2 suítes" },
];
const FLOOR_OPTIONS: { value: FloorFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "high", label: `Altos ${FLOOR_RANGES.high[2]}` },
  { value: "mid", label: `Médios ${FLOOR_RANGES.mid[2]}` },
  { value: "low", label: `Baixos ${FLOOR_RANGES.low[2]}` },
];
const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "disponível", label: "Disponível" },
  { value: "reservada", label: "Reservada" },
  { value: "vendida", label: "Vendida" },
];

/** Highest floor first: the order a buyer reads a tower in. */
const SORTED = [...AURORA_UNITS].sort((a, b) => b.floor - a.floor || a.id.localeCompare(b.id));
const AVAILABLE = AURORA_UNITS.filter((u) => u.status === "disponível").length;
const PAGE = 10;

/**
 * Unit explorer: three filters over the 42 residences, a stacking plan of the tower (desktop)
 * and the list. Picking a unit scrolls back to the tour and lights its floor on the facade.
 * Sold units stay listed (it sells scarcity) but can't be picked.
 */
export function SiteUnits() {
  const [type, setType] = useState<TypeFilter>("all");
  const [floors, setFloors] = useState<FloorFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [all, setAll] = useState(false);
  const [hover, setHover] = useState<string | null>(null);

  const match = (u: AuroraUnit) =>
    (type === "all" || u.type === type) &&
    (floors === "all" || (u.floor >= FLOOR_RANGES[floors][0] && u.floor <= FLOOR_RANGES[floors][1])) &&
    (status === "all" || u.status === status);
  const list = SORTED.filter(match);
  const shown = all ? list : list.slice(0, PAGE);

  const select = (u: AuroraUnit) => {
    if (u.status === "vendida") return;
    emitSite("unit", u);
    scrollToSection("top");
  };

  return (
    <SiteSection id={SECTION.units}>
      <div className="flex flex-wrap items-end justify-between gap-8">
        <SiteHeading
          eyebrow="Residências"
          title="Escolha o andar. A vista vem junto."
          lead={`${AURORA.floors} andares, duas residências por andar: a A, de 127 m² e três suítes, de frente para o mar; a B, de 98 m² e duas suítes, com vista lateral. Toque em uma unidade para vê-la na fachada.`}
        />
        <p className="flex items-baseline gap-3 text-au-mute">
          <span className="font-aurora text-[44px] leading-none text-au-ink">{AVAILABLE}</span>
          <span className="text-[10px] leading-tight font-semibold tracking-[0.22em] uppercase">
            de {AURORA_UNITS.length}
            <br />
            disponíveis
          </span>
        </p>
      </div>

      <div className="mt-12 grid gap-x-6 gap-y-4 border-y border-au-line py-5 md:grid-cols-[auto_1fr] md:items-center">
        <Filter label="Tipologia" options={TYPE_OPTIONS} value={type} onChange={setType} />
        <Filter label="Andar" options={FLOOR_OPTIONS} value={floors} onChange={setFloors} />
        <Filter label="Status" options={STATUS_OPTIONS} value={status} onChange={setStatus} />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[220px_1fr] lg:gap-14">
        <Stack match={match} hover={hover} setHover={setHover} onPick={select} />

        <div>
          <p aria-live="polite" className="text-[11px] font-semibold tracking-[0.2em] text-au-mute uppercase">
            {list.length === 0
              ? "Nenhuma residência com esses filtros"
              : `${list.length} ${list.length === 1 ? "residência" : "residências"}`}
          </p>

          <div
            aria-hidden
            className="mt-4 hidden grid-cols-[72px_64px_1fr_76px_56px_52px_132px_118px_24px] gap-4 border-b border-au-line pb-3 text-[9.5px] font-semibold tracking-[0.22em] text-au-mute uppercase md:grid"
          >
            <span>Unidade</span>
            <span>Andar</span>
            <span>Tipologia</span>
            <span>Área</span>
            <span>Suítes</span>
            <span>Vagas</span>
            <span className="text-right">Valor</span>
            <span>Status</span>
            <span />
          </div>

          <ul className="max-md:mt-4">
            {shown.map((u) => {
              const sold = u.status === "vendida";
              const t = AURORA_TYPES[u.type];
              return (
                <li key={u.id} className="border-b border-au-line max-md:border max-md:border-b-au-line max-md:not-first:-mt-px">
                  <button
                    type="button"
                    disabled={sold}
                    onClick={() => select(u)}
                    onPointerEnter={() => setHover(u.id)}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover(u.id)}
                    onBlur={() => setHover(null)}
                    aria-label={
                      sold
                        ? `Residência ${u.id}, vendida`
                        : `Ver a residência ${u.id} no prédio: ${u.floor}º andar, ${t.name}, ${u.area} m², ${brl(u.price)}, ${AURORA_STATUS_LABEL[u.status]}`
                    }
                    data-on={hover === u.id}
                    className="group grid w-full items-center gap-x-4 gap-y-1 px-0 py-4 text-left transition-colors duration-300 enabled:hover:bg-white/[0.03] focus-visible:outline-au-gold disabled:cursor-not-allowed max-md:grid-cols-[1fr_auto] max-md:px-4 md:grid-cols-[72px_64px_1fr_76px_56px_52px_132px_118px_24px] md:py-[18px] data-[on=true]:bg-white/[0.03]"
                  >
                    <span className={cn("font-aurora text-[22px] leading-none tabular-nums", sold && "text-au-mute/70")}>
                      {u.id}
                      <span className="ml-3 align-middle text-[11px] font-sans text-au-mute md:hidden">
                        {u.floor}º andar · {t.name}
                      </span>
                    </span>
                    <span className="text-[13px] text-au-mute tabular-nums max-md:hidden">{u.floor}º</span>
                    <span className="text-[13px] max-md:hidden">
                      <span className={sold ? "text-au-mute" : "text-au-ink"}>{t.name}</span>
                      <span className="text-au-mute"> · {t.face}</span>
                    </span>
                    <span className="text-[13px] text-au-mute tabular-nums max-md:hidden">{u.area} m²</span>
                    <span className="text-[13px] text-au-mute tabular-nums max-md:hidden">{u.suites}</span>
                    <span className="text-[13px] text-au-mute tabular-nums max-md:hidden">{u.vagas}</span>
                    <span
                      className={cn(
                        "text-right text-[14px] font-semibold tabular-nums max-md:row-start-2 max-md:text-left max-md:text-[13px]",
                        sold && "text-au-mute line-through decoration-au-mute/60",
                      )}
                    >
                      {brl(u.price)}
                    </span>
                    <span className="col-span-2 text-[12px] text-au-mute md:hidden">
                      {u.area} m² · {u.suites} suítes · {u.vagas} vagas · {t.face}
                    </span>
                    <span className="max-md:col-start-2 max-md:row-start-1 max-md:justify-self-end">
                      <StatusChip status={u.status} />
                    </span>
                    <span
                      aria-hidden
                      className="text-au-gold transition-transform duration-300 ease-soft group-enabled:group-hover:translate-x-1 group-disabled:opacity-0 max-md:hidden"
                    >
                      →
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {list.length > PAGE && (
            <button
              type="button"
              onClick={() => setAll((v) => !v)}
              className="mt-6 border border-au-line px-5 py-3.5 text-[10px] leading-none font-bold tracking-[0.22em] text-au-ink uppercase transition-colors hover:border-au-gold hover:text-au-gold"
            >
              {all ? "Mostrar menos" : `Ver todas as ${list.length}`}
            </button>
          )}
        </div>
      </div>
    </SiteSection>
  );
}

function Filter<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <>
      <span className="text-[9.5px] font-semibold tracking-[0.24em] text-au-gold uppercase max-md:-mb-2 max-md:mt-1">{label}</span>
      <div role="group" aria-label={label} className="-mx-[var(--pad)] flex gap-1.5 overflow-x-auto px-[var(--pad)] [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className="shrink-0 border border-au-line px-3.5 py-2.5 text-[11.5px] leading-none whitespace-nowrap text-au-ink/85 transition-colors hover:border-au-gold focus-visible:outline-au-gold aria-pressed:border-au-ink aria-pressed:bg-au-ink aria-pressed:text-au-bg"
          >
            {o.label}
          </button>
        ))}
      </div>
    </>
  );
}

export function StatusChip({ status, className }: { status: AuroraStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 border px-2.5 py-1.5 text-[9px] leading-none font-bold tracking-[0.2em] uppercase",
        status === "disponível" && "border-au-gold/50 text-au-gold",
        status === "reservada" && "border-au-ink/30 text-au-ink/80",
        status === "vendida" && "border-au-mute/25 text-au-mute/70",
        className,
      )}
    >
      <i
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "disponível" && "bg-au-gold",
          status === "reservada" && "border border-au-ink/70",
          status === "vendida" && "bg-au-mute/40",
        )}
      />
      {AURORA_STATUS_LABEL[status]}
    </span>
  );
}

/** The tower as a grid: 21 floors × 2 residences, coloured by status, dimmed by the filters. */
function Stack({
  match,
  hover,
  setHover,
  onPick,
}: {
  match: (u: AuroraUnit) => boolean;
  hover: string | null;
  setHover: (id: string | null) => void;
  onPick: (u: AuroraUnit) => void;
}) {
  return (
    <figure className="max-lg:hidden">
      <div className="sticky top-28">
        <div className="mb-3 grid grid-cols-[28px_1fr_1fr] gap-1.5 text-[9px] font-semibold tracking-[0.2em] text-au-mute uppercase">
          <span />
          <span className="text-center">A</span>
          <span className="text-center">B</span>
        </div>
        <div className="grid gap-[3px]">
          {Array.from({ length: AURORA.floors }, (_, i) => AURORA.floors - i).map((floor) => (
            <div key={floor} className="grid grid-cols-[28px_1fr_1fr] items-center gap-1.5">
              <span className="text-[10px] text-au-mute tabular-nums">{String(floor).padStart(2, "0")}</span>
              {AURORA_UNITS.filter((u) => u.floor === floor).map((u) => {
                const on = match(u);
                return (
                  <button
                    key={u.id}
                    type="button"
                    tabIndex={-1}
                    aria-hidden
                    disabled={u.status === "vendida"}
                    onClick={() => onPick(u)}
                    onPointerEnter={() => setHover(u.id)}
                    onPointerLeave={() => setHover(null)}
                    data-status={u.status}
                    data-on={hover === u.id}
                    className={cn(
                      "h-[15px] border transition-[opacity,background-color,border-color] duration-300 disabled:cursor-not-allowed",
                      "data-[status=disponível]:border-au-gold/60 data-[status=disponível]:bg-au-gold/25 data-[status=disponível]:hover:bg-au-gold",
                      "data-[status=reservada]:border-au-ink/35 data-[status=reservada]:bg-transparent data-[status=reservada]:hover:bg-au-ink/40",
                      "data-[status=vendida]:border-transparent data-[status=vendida]:bg-white/[0.06]",
                      "data-[on=true]:!border-au-ink data-[on=true]:!bg-au-gold",
                      !on && "opacity-20",
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <figcaption className="mt-5 grid gap-2 text-[10.5px] text-au-mute">
          <span className="flex items-center gap-2.5">
            <i aria-hidden className="h-2.5 w-4 border border-au-gold/60 bg-au-gold/25" /> Disponível
          </span>
          <span className="flex items-center gap-2.5">
            <i aria-hidden className="h-2.5 w-4 border border-au-ink/35" /> Reservada
          </span>
          <span className="flex items-center gap-2.5">
            <i aria-hidden className="h-2.5 w-4 bg-white/[0.06]" /> Vendida
          </span>
        </figcaption>
      </div>
    </figure>
  );
}
