"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { DEMOS } from "@/content/site";
import { cn } from "@/lib/cn";

/**
 * MatsuHub's own chrome above every site-demo: the host site (dark, lime, Unbounded) framing a
 * guest site. Left: logo + "Voltar para a MatsuHub". Centre: "Você está vendo um site-demo" and a
 * switcher between the live demos. Right: the lime CTA. Phones: compact back, a dropdown switcher
 * and a short CTA. The back control is lime-outlined so the way out is never in doubt.
 */
export function DemoBar() {
  const pathname = usePathname();
  const current = DEMOS.find((demo) => pathname.startsWith(demo.href)) ?? DEMOS[0];

  /** The dropdown is open for the page it was opened on, so navigating closes it. */
  const [menuAt, setMenuAt] = useState<string | null>(null);
  const menu = menuAt === pathname;
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuAt(null);
    };
    const down = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuAt(null);
    };
    window.addEventListener("keydown", key);
    window.addEventListener("pointerdown", down);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("pointerdown", down);
    };
  }, [menu]);

  return (
    <div
      role="banner"
      aria-label="MatsuHub — barra do site-demo"
      className="fixed inset-x-0 top-0 z-[60] h-[var(--demo-bar-h)] bg-[#050807] font-sans text-ink"
    >
      <div className="mx-auto flex h-full max-w-[1600px] items-center gap-2 px-[var(--pad)] max-sm:gap-1.5 max-sm:px-2.5 lg:gap-6">
        {/* left: who the host is, and the way back */}
        <div className="relative flex min-w-0 items-center gap-3 lg:gap-4">
          <Link href="/" aria-label="MatsuHub, página inicial" className="flex h-10 shrink-0 items-center max-md:hidden">
            <Logo />
          </Link>
          <span aria-hidden className="h-6 w-px bg-line-2 max-md:hidden" />
          <Link
            href="/#demos"
            className="group flex h-10 shrink-0 items-center gap-2 rounded-full border border-acc/55 bg-acc/[0.04] pr-4 pl-3 text-[13px] font-bold whitespace-nowrap transition-[border-color,color,background-color] duration-200 hover:border-acc hover:bg-acc/[0.1] hover:text-acc max-md:gap-1.5 max-md:pr-3 max-md:pl-2.5"
          >
            <span aria-hidden className="text-acc transition-transform duration-300 ease-soft group-hover:-translate-x-0.5">
              ←
            </span>
            <span className="md:hidden">
              <Logo wordmark={false} className="align-middle [&_svg]:h-[18px] [&_svg]:w-[18px]" />
            </span>
            <span className="max-md:hidden">Voltar para a MatsuHub</span>
            <span className="md:hidden">Voltar</span>
          </Link>
        </div>

        {/* centre: "this is a sample" + the gallery of demos */}
        <div className="flex min-w-0 flex-1 items-center justify-center gap-4">
          <p className="flex items-center gap-2 font-mono text-[10.5px] font-medium tracking-[0.14em] whitespace-nowrap text-mute uppercase max-[1379px]:hidden">
            <i aria-hidden className="h-1.5 w-1.5 rounded-full bg-acc shadow-[0_0_10px_var(--color-acc)]" />
            Você está vendo um site-demo
          </p>
          <nav aria-label="Outros site-demos" className="max-md:hidden">
            <ul className="flex items-center rounded-full border border-line bg-white/[0.02] p-1">
              {DEMOS.map((demo) => {
                const on = demo.id === current.id;
                return (
                  <li key={demo.id}>
                    <Link
                      href={demo.href}
                      aria-current={on ? "page" : undefined}
                      title={`${demo.segment} — ${demo.name}`}
                      className={cn(
                        "flex h-8 items-center gap-2 rounded-full px-3.5 font-mono text-[11.5px] font-medium tracking-[0.04em] whitespace-nowrap transition-colors duration-200",
                        on ? "bg-acc/[0.12] text-acc" : "text-mute hover:bg-white/[0.05] hover:text-ink",
                      )}
                    >
                      {on && <i aria-hidden className="h-1.5 w-1.5 rounded-full bg-acc" />}
                      {demo.segment}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* phones and small tablets: the current segment opens a list of demos */}
          <div ref={menuRef} className="relative min-w-0 md:hidden">
            <button
              type="button"
              aria-expanded={menu}
              aria-controls="demo-switcher"
              aria-label={`Demo atual: ${current.segment}. Trocar de demo`}
              onClick={() => setMenuAt(menu ? null : pathname)}
              className="flex h-10 max-w-full min-w-0 items-center gap-2 rounded-full border border-line bg-white/[0.02] pr-2.5 pl-3 font-mono text-[11.5px] max-[400px]:gap-1.5 max-[400px]:pr-2 max-[400px]:pl-2.5 font-medium text-acc transition-colors aria-expanded:border-acc/60"
            >
              <i aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-acc max-[400px]:hidden" />
              <span className="truncate">{current.segment}</span>
              <svg aria-hidden viewBox="0 0 12 12" className={cn("h-3 w-3 shrink-0 text-mute transition-transform duration-300", menu && "rotate-180")}>
                <path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* right: the reason the visitor is here */}
        <div className="flex shrink-0 justify-end lg:min-w-[190px]">
          <Link
            href="/#contato"
            className="btn btn-primary h-10 px-4 text-[13px] max-sm:px-3 max-sm:text-[12.5px]"
          >
            <span className="max-sm:hidden">Quero um site assim</span>
            <span className="sm:hidden">Quero um assim</span>
            <span aria-hidden className="btn-arrow max-sm:hidden">
              →
            </span>
          </Link>
        </div>
      </div>

      {/* the lime line that separates host and guest */}
      <i
        aria-hidden
        className="absolute inset-x-0 bottom-0 block h-px bg-[linear-gradient(90deg,rgb(185_255_75/0.25),var(--color-acc)_30%,var(--color-acc)_70%,rgb(185_255_75/0.25))] shadow-[0_0_12px_rgb(185_255_75/0.55)]"
      />

      {/* phone dropdown panel, full width under the bar */}
      <div
        id="demo-switcher"
        data-open={menu}
        inert={!menu}
        className="absolute inset-x-0 top-full border-b border-line-2 bg-[#050807]/97 px-3 pt-3 pb-4 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.9)] backdrop-blur-xl transition-[opacity,translate] duration-300 ease-soft data-[open=false]:pointer-events-none data-[open=false]:-translate-y-2 data-[open=false]:opacity-0 md:hidden"
      >
        <p className="px-1 pb-2.5 font-mono text-[10.5px] font-medium tracking-[0.14em] text-mute uppercase">
          Você está vendo um site-demo · escolha outro
        </p>
        <ul className="grid gap-2">
          {DEMOS.map((demo) => {
            const on = demo.id === current.id;
            return (
              <li key={demo.id}>
                <Link
                  href={demo.href}
                  aria-current={on ? "page" : undefined}
                  onClick={() => setMenuAt(null)}
                  className={cn(
                    "flex items-center gap-3 rounded-[12px] border p-2 pr-3 transition-colors",
                    on ? "border-acc/50 bg-acc/[0.06]" : "border-line active:border-acc/50",
                  )}
                >
                  <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-[8px] bg-bg-3">
                    <Image src={demo.image.src} alt="" fill sizes="64px" className="object-cover" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[10.5px] tracking-[0.12em] text-acc uppercase">{demo.segment}</span>
                    <span className="block truncate font-display text-[14px] font-semibold">{demo.name}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[10.5px] text-mute">{on ? "você está aqui" : "abrir →"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
