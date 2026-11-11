"use client";

import { useSyncExternalStore } from "react";
import { brl } from "@/content/mare";
import { cn } from "@/lib/cn";
import { addToComanda, clearComanda, comandaLines, comandaStore, emitSite } from "./bus";

export function useComanda() {
  return comandaLines(useSyncExternalStore(comandaStore.subscribe, comandaStore.get, comandaStore.server));
}

/** The running order: lines with − / + , the total and "Enviar para a Nina". */
export function SiteComanda({ className }: { className?: string }) {
  const { lines, count, total } = useComanda();

  return (
    <section aria-labelledby="mare-comanda-title" className={cn("rounded-[18px] border border-ma-line bg-ma-bg-2/80", className)}>
      <header className="flex items-baseline justify-between gap-3 border-b border-ma-line px-5 py-4">
        <h3 id="mare-comanda-title" className="font-mare text-[26px] leading-none italic">
          Comanda
        </h3>
        <span className="text-[11px] tracking-[0.18em] text-ma-mute uppercase" aria-live="polite">
          {count === 0 ? "vazia" : `${count} ${count === 1 ? "item" : "itens"}`}
        </span>
      </header>

      {lines.length === 0 ? (
        <p className="px-5 py-6 text-[13.5px] leading-relaxed text-ma-mute">
          Abra um prato e toque em <span className="text-ma-ink">Adicionar à comanda</span>. A Nina pode montar um jantar
          completo para você.
        </p>
      ) : (
        <ul className="divide-y divide-ma-line/70 px-5">
          {lines.map(({ dish, qty }) => (
            <li key={dish.id} className="flex items-center gap-3 py-3.5 starting:opacity-0 transition-opacity duration-500">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] text-ma-ink">{dish.name}</span>
                <span className="mt-0.5 block text-[12px] text-ma-mute lining-nums tabular-nums">
                  {qty} × {brl(dish.price)}
                </span>
              </span>
              <span className="flex items-center rounded-full border border-ma-line">
                <button
                  type="button"
                  onClick={() => addToComanda(dish.id, -1)}
                  aria-label={`Tirar um ${dish.name}`}
                  className="grid h-8 w-8 place-items-center rounded-full text-[15px] text-ma-mute transition-colors hover:text-ma-ink"
                >
                  −
                </button>
                <span className="w-5 text-center text-[13px] lining-nums tabular-nums">{qty}</span>
                <button
                  type="button"
                  onClick={() => addToComanda(dish.id, 1)}
                  aria-label={`Mais um ${dish.name}`}
                  className="grid h-8 w-8 place-items-center rounded-full text-[15px] text-ma-mute transition-colors hover:text-ma-ink"
                >
                  +
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <footer className="border-t border-ma-line px-5 pt-4 pb-5">
        <p className="flex items-baseline justify-between">
          <span className="text-[11px] tracking-[0.2em] text-ma-mute uppercase">Total</span>
          <span data-comanda-total className="font-mare text-[30px] leading-none lining-nums tabular-nums">
            {brl(total)}
          </span>
        </p>
        <button
          type="button"
          disabled={count === 0}
          onClick={() => emitSite("nina", { topic: "order" })}
          className="mt-4 flex w-full items-center justify-center gap-3 rounded-full bg-ma-ember px-5 py-3.5 text-[10.5px] leading-none font-bold tracking-[0.22em] text-ma-bg uppercase transition-[background-color,opacity] hover:bg-ma-ink disabled:pointer-events-none disabled:opacity-35"
        >
          Enviar para a Nina <span aria-hidden>→</span>
        </button>
        <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-ma-mute">
          <span>Simulação: nada é cobrado.</span>
          {count > 0 && (
            <button type="button" onClick={clearComanda} className="underline underline-offset-2 transition-colors hover:text-ma-ink">
              Limpar
            </button>
          )}
        </div>
      </footer>
    </section>
  );
}
