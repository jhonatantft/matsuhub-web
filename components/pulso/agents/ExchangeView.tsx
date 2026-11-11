"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import type { Exchange } from "./mcpClient";

const noop = () => () => {};

/** window.location.origin on the client, "" during SSR (no effect + setState needed). */
export function useOrigin() {
  return useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => "",
  );
}

const pretty = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v, null, 2));

function StatusChip({ x }: { x: Exchange }) {
  const tone = x.status === 0 || x.status >= 400 ? "bg-red-500/15 text-red-300" : x.failed ? "bg-amber-400/15 text-amber-200" : "bg-emerald-400/15 text-emerald-300";
  return (
    <span className={cn("rounded-full px-2 py-0.5 font-mono text-[11px] tabular-nums", tone)}>
      {x.status === 0 ? "rede" : `HTTP ${x.status}`}
    </span>
  );
}

/** One real request/response pair, collapsible. Dark-panel styling. */
export function ExchangeView({ x, open = false }: { x: Exchange; open?: boolean }) {
  const headerLines = Object.entries(x.http.headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03]">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
        <span className="min-w-0 truncate font-mono text-[12.5px] text-white">{x.label}</span>
        <StatusChip x={x} />
        <span className="font-mono text-[11px] tabular-nums text-white/45">{x.ms} ms</span>
        {x.error && <span className="w-full font-mono text-[11px] text-amber-200/90">{x.error}</span>}
      </header>
      <details className="group border-t border-white/10">
        <summary className="cursor-pointer select-none px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-white/50 hover:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#00c8f0]">
          Requisição · {x.http.method} {x.http.url}
        </summary>
        <pre className="max-h-72 overflow-auto px-3 pb-3 font-mono text-[11.5px] leading-relaxed text-white/70">
          {headerLines}
          {x.request !== undefined ? `\n\n${pretty(x.request)}` : ""}
        </pre>
      </details>
      <details className="border-t border-white/10" open={open}>
        <summary className="cursor-pointer select-none px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-white/50 hover:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#00c8f0]">
          Resposta
        </summary>
        <pre className="max-h-80 overflow-auto px-3 pb-3 font-mono text-[11.5px] leading-relaxed text-[#b9f3ff]/85">
          {x.response === null ? "(sem corpo)" : pretty(x.response)}
        </pre>
      </details>
    </article>
  );
}
