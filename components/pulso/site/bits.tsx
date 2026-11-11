"use client";

import Image from "next/image";
import { useId, useSyncExternalStore } from "react";
import type { PulsoProduct } from "@/content/pulso";
import { cn } from "@/lib/cn";
import { cartStore, compareStore, interestStore, searchStore, uiStore } from "./store";

export const useCart = () => useSyncExternalStore(cartStore.subscribe, cartStore.get, cartStore.server);
export const useUi = () => useSyncExternalStore(uiStore.subscribe, uiStore.get, uiStore.server);
export const useCompare = () => useSyncExternalStore(compareStore.subscribe, compareStore.get, compareStore.server);
export const useInterest = () => useSyncExternalStore(interestStore.subscribe, interestStore.get, interestStore.server);
export const useSearch = () => useSyncExternalStore(searchStore.subscribe, searchStore.get, searchStore.server);

/** The Pulso mark: a ring with an iridescent arc, then the name. */
export function Wordmark({ className }: { className?: string }) {
  const id = useId();
  return (
    <span className={cn("flex items-center gap-2 font-pulso text-[19px] leading-none font-semibold tracking-[-0.04em] text-pu-ink", className)}>
      <svg viewBox="0 0 24 24" aria-hidden className="h-[22px] w-[22px]">
        <defs>
          <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--color-pu-acc)" />
            <stop offset="1" stopColor="var(--color-pu-acc-2)" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeOpacity=".16" strokeWidth="2.2" />
        <path d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5" fill="none" stroke={`url(#${id}g)`} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M6.5 12h2.6l1.4-3.2 2.4 6.4 1.5-3.2h3.1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      pulso
    </span>
  );
}

/** Mono technical label: "01 — Produtos". */
export function Eyebrow({ n, children, className }: { n?: string; children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-center gap-3 font-mono text-[10.5px] leading-none tracking-[0.18em] text-pu-mute uppercase", className)}>
      {n && <span className="text-pu-acc">{n}</span>}
      {n && <i aria-hidden className="h-px w-6 bg-pu-line" />}
      {children}
    </p>
  );
}

/** Product photo on its own studio backdrop. */
export function Photo({ product, sizes, className, priority }: { product: PulsoProduct; sizes: string; className?: string; priority?: boolean }) {
  return (
    <div className={cn("relative overflow-hidden bg-[#e4e4ea]", className)}>
      <Image src={product.image.small} alt={product.image.alt} fill sizes={sizes} priority={priority} className="object-cover" />
    </div>
  );
}

export function StockTag({ product, className }: { product: PulsoProduct; className?: string }) {
  const low = product.stock <= 6;
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-[10px] leading-none tracking-[0.08em] uppercase", low ? "text-[#c2410c]" : "text-pu-mute", className)}>
      <i aria-hidden className={cn("h-1.5 w-1.5 rounded-full", low ? "bg-[#f97316]" : "bg-[#22c55e]")} />
      {low ? `últimas ${product.stock} unidades` : `${product.stock} em estoque`}
    </span>
  );
}

/** Thin iridescent hairline used sparingly as an accent. */
export const IRIS = "bg-[linear-gradient(90deg,var(--color-pu-acc),var(--color-pu-acc-2))]";
