"use client";

import { brl } from "@/content/pulso";
import { cn } from "@/lib/cn";
import { Eyebrow, Photo, useCompare } from "./bits";
import { compareList, ROWS, verdicts, winners } from "./compare";
import { USE_LABEL } from "./intent";
import { addToCart, clearCompare, scrollToSection, SECTION, short, toggleCompare } from "./store";

/** Side-by-side comparison of the ticked products (2–3), best value per row, verdict per use. */
export function SiteCompare() {
  const ids = useCompare();
  const list = compareList(ids);
  const ready = list.length >= 2;
  const rows = ready ? ROWS.map((row) => ({ row, win: winners(row, list) })) : [];
  const verdict = ready ? verdicts(list) : [];

  return (
    <>
      <section id="comparar" aria-labelledby="comparar-title" className="relative scroll-mt-[calc(var(--demo-bar-h,0px)+56px)] border-t border-pu-line bg-pu-bg-2 px-[var(--pad)] pb-[clamp(72px,9vw,128px)]">
        <div className="mx-auto max-w-[1320px] pt-[clamp(48px,6vw,80px)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow n="04">Comparar</Eyebrow>
              <h2 id="comparar-title" className="mt-5 font-pulso text-[clamp(28px,3.4vw,46px)] leading-none font-semibold tracking-[-0.05em] text-pu-ink">
                Lado a lado, sem achismo.
              </h2>
            </div>
            {ids.length > 0 && (
              <button type="button" onClick={clearCompare} className="text-[12.5px] text-pu-mute underline-offset-4 hover:text-pu-ink hover:underline">
                Limpar seleção
              </button>
            )}
          </div>

          {!ready ? (
            <p className="mt-6 max-w-[560px] rounded-[16px] border border-dashed border-pu-line px-5 py-4 text-[14px] leading-relaxed text-pu-mute">
              Marque <b className="font-medium text-pu-ink">Comparar</b> em 2 ou 3 produtos acima. A tabela usa as fichas técnicas e destaca o melhor valor de cada linha.
              {ids.length === 1 && <> Falta mais um.</>}
            </p>
          ) : (
            <>
              <div className="mt-8 -mx-[var(--pad)] overflow-x-auto px-[var(--pad)] pb-2" data-lenis-prevent-horizontal>
                <table className="w-full min-w-[560px] border-separate border-spacing-0 text-left text-[13.5px]">
                  <caption className="sr-only">Comparação de {list.map((p) => p.name).join(", ")}</caption>
                  <thead>
                    <tr>
                      <th scope="col" className="w-[24%] align-bottom font-mono text-[10px] font-normal tracking-[0.14em] text-pu-mute uppercase">
                        Ficha
                      </th>
                      {list.map((p) => (
                        <th key={p.id} scope="col" className="px-3 pb-4 align-bottom font-normal">
                          <div className="flex items-center gap-3">
                            <Photo product={p} sizes="56px" className="h-14 w-14 shrink-0 rounded-[12px]" />
                            <div className="min-w-0">
                              <p className="font-pulso text-[16px] font-semibold tracking-[-0.03em] text-pu-ink">{short(p)}</p>
                              <button
                                type="button"
                                onClick={() => toggleCompare(p.id)}
                                aria-label={`Tirar ${p.name} da comparação`}
                                className="text-[11.5px] text-pu-mute hover:text-pu-ink"
                              >
                                tirar ✕
                              </button>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ row, win }) => (
                      <tr key={row.label}>
                        <th scope="row" className="border-t border-pu-line py-3 pr-3 text-[12.5px] font-normal text-pu-mute">
                          {row.label}
                        </th>
                        {list.map((p, i) => (
                          <td
                            key={p.id}
                            className={cn("border-t border-pu-line px-3 py-3 text-pu-ink tabular-nums", win.has(i) && "font-semibold")}
                          >
                            <span className={cn("inline-flex items-center gap-1.5", win.has(i) && "rounded-full bg-pu-acc/[0.08] px-2 py-0.5 text-pu-acc -mx-2")}>
                              {row.show(p)}
                              {win.has(i) && <span className="sr-only"> (melhor)</span>}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr>
                      <th scope="row" className="border-t border-pu-line" />
                      {list.map((p) => (
                        <td key={p.id} className="border-t border-pu-line px-3 pt-4">
                          <button
                            type="button"
                            onClick={() => addToCart(p.id)}
                            className="rounded-full border border-pu-ink/15 px-3.5 py-2 text-[12px] font-medium text-pu-ink transition-colors hover:bg-pu-ink hover:text-white"
                          >
                            + {brl(p.price)}
                          </button>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {verdict.length > 0 && (
                <div className="mt-8 rounded-[20px] bg-[linear-gradient(120deg,rgb(91_75_255/0.35),rgb(0_200_240/0.3))] p-px">
                  <div className="rounded-[19px] bg-white/95 px-5 py-5">
                    <p className="font-mono text-[10px] tracking-[0.16em] text-pu-mute uppercase">Veredito por uso · calculado das fichas</p>
                    <ul className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                      {verdict.map((v) => (
                        <li key={v.use} className="text-[14px] leading-snug text-pu-ink">
                          <span className="text-pu-mute">Para {USE_LABEL[v.use]}:</span> <b className="font-semibold">{v.text.split(",")[0]}</b>
                          {v.text.slice(v.text.indexOf(","))}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* tray: what is ticked, from anywhere on the page */}
      <div
        data-show={ids.length > 0}
        inert={ids.length === 0}
        className="fixed bottom-4 left-4 z-[65] flex items-center gap-2 rounded-full border border-pu-line bg-white/90 py-1.5 pr-1.5 pl-2 shadow-[0_18px_50px_-18px_rgb(12_13_18/0.45)] backdrop-blur-xl transition-[opacity,translate] duration-500 ease-soft data-[show=false]:pointer-events-none data-[show=false]:translate-y-4 data-[show=false]:opacity-0 max-sm:bottom-[76px] sm:bottom-6 sm:left-6"
      >
        <span className="flex -space-x-2">
          {list.map((p) => (
            <Photo key={p.id} product={p} sizes="28px" className="h-7 w-7 rounded-full ring-2 ring-white" />
          ))}
        </span>
        <span className="px-1 font-mono text-[11px] text-pu-mute">{ids.length}/3</span>
        <button
          type="button"
          disabled={!ready}
          onClick={() => scrollToSection(SECTION.compare)}
          className="rounded-full bg-pu-ink px-3.5 py-2 text-[12px] leading-none font-medium text-white transition-opacity disabled:opacity-40"
        >
          Comparar
        </button>
      </div>
    </>
  );
}
