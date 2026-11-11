"use client";

import { useEffect, useId, useState } from "react";
import { AURORA_FEATURED, brl } from "@/content/aurora";
import { onSite, SECTION } from "./bus";
import { SiteHeading, SiteSection } from "./SiteSection";

/** Monthly instalment by the Price table (constant instalments, annual rate converted to monthly). */
export function priceInstalment(principal: number, annualRate: number, months: number) {
  if (principal <= 0 || months <= 0) return 0;
  const i = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
  if (i === 0) return principal / months;
  return (principal * i) / (1 - Math.pow(1 + i, -months));
}

const pct = (v: number, digits = 0) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;

/**
 * Financing simulator: price, down payment %, term in months and annual rate → monthly
 * instalment (Price). Picking a residence elsewhere on the page sets its price here.
 */
export function SiteFinance() {
  const [value, setValue] = useState<number>(AURORA_FEATURED.price);
  const [down, setDown] = useState(30);
  const [months, setMonths] = useState(360);
  const [rate, setRate] = useState(10.5);
  const [unitId, setUnitId] = useState<string | null>(AURORA_FEATURED.id);

  useEffect(
    () =>
      onSite("unit", (u) => {
        setValue(u.price);
        setUnitId(u.id);
      }),
    [],
  );

  const entry = Math.round((value * down) / 100);
  const financed = value - entry;
  const pmt = priceInstalment(financed, rate, months);
  const total = pmt * months + entry;

  return (
    <SiteSection id={SECTION.finance}>
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <SiteHeading
          eyebrow="Financiamento"
          title="Quanto fica por mês?"
          lead="Ajuste valor, entrada, prazo e taxa e veja a parcela na hora. A conta usa a tabela Price, a mesma da maioria dos bancos."
        />

        <div className="border border-au-line bg-au-bg-2/50">
          <div className="grid gap-7 p-6 sm:p-8">
            <Slider
              label="Valor do imóvel"
              value={value}
              min={900_000}
              max={2_400_000}
              step={10_000}
              display={brl(value)}
              note={unitId ? `Residência ${unitId}` : undefined}
              onChange={(v) => {
                setValue(v);
                setUnitId(null);
              }}
            />
            <Slider
              label="Entrada"
              value={down}
              min={20}
              max={80}
              step={1}
              display={`${pct(down)} · ${brl(entry)}`}
              onChange={setDown}
            />
            <Slider
              label="Prazo"
              value={months}
              min={60}
              max={420}
              step={12}
              display={`${months} meses · ${Math.round(months / 12)} anos`}
              onChange={setMonths}
            />
            <Slider
              label="Taxa de juros ao ano"
              value={rate}
              min={7}
              max={14}
              step={0.1}
              display={pct(rate, 1)}
              onChange={(v) => setRate(Math.round(v * 10) / 10)}
            />
          </div>

          <div className="border-t border-au-line p-6 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.24em] text-au-gold uppercase">Parcela mensal</p>
                <p aria-live="polite" className="mt-3 font-aurora text-[clamp(40px,5vw,58px)] leading-none font-light tabular-nums">
                  {brl(Math.round(pmt))}
                </p>
              </div>
              <span className="border border-au-line px-2.5 py-1.5 text-[9px] leading-none font-bold tracking-[0.2em] text-au-mute uppercase">
                Simulação ilustrativa
              </span>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-au-line pt-5 text-[13px] sm:grid-cols-3">
              <div>
                <dt className="text-au-mute">Financiado</dt>
                <dd className="mt-1 tabular-nums">{brl(financed)}</dd>
              </div>
              <div>
                <dt className="text-au-mute">Entrada</dt>
                <dd className="mt-1 tabular-nums">{brl(entry)}</dd>
              </div>
              <div>
                <dt className="text-au-mute">Total pago</dt>
                <dd className="mt-1 tabular-nums">{brl(Math.round(total))}</dd>
              </div>
            </dl>
            <p className="mt-5 text-[11.5px] leading-relaxed text-au-mute">
              Simulação ilustrativa pela tabela Price, sem seguros, taxas e correção. As condições reais dependem da análise de crédito.
            </p>
          </div>
        </div>
      </div>
    </SiteSection>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  note,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  note?: string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <label htmlFor={id} className="text-[10px] font-semibold tracking-[0.22em] text-au-mute uppercase">
          {label}
          {note && <span className="ml-2 tracking-[0.16em] text-au-gold normal-case">· {note}</span>}
        </label>
        <output htmlFor={id} className="text-[15px] font-semibold tabular-nums">
          {display}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ "--fill": `${fill}%` } as React.CSSProperties}
        className="au-range mt-3.5 w-full"
      />
    </div>
  );
}

/** Range input skin (thin track, gold fill, square thumb). Rendered once by the page. */
export const RANGE_CSS = `
.au-range{appearance:none;-webkit-appearance:none;height:22px;background:transparent;cursor:pointer}
.au-range::-webkit-slider-runnable-track{height:2px;background:linear-gradient(90deg,var(--color-au-gold) var(--fill),rgb(231 197 138/.2) var(--fill))}
.au-range::-moz-range-track{height:2px;background:linear-gradient(90deg,var(--color-au-gold) var(--fill),rgb(231 197 138/.2) var(--fill))}
.au-range::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;margin-top:-7px;background:var(--color-au-ink);border:1px solid var(--color-au-gold);transform:rotate(45deg)}
.au-range::-moz-range-thumb{width:14px;height:14px;background:var(--color-au-ink);border:1px solid var(--color-au-gold);border-radius:0;transform:rotate(45deg)}
.au-range:focus-visible{outline:1px solid var(--color-au-gold);outline-offset:4px}
`;
