"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { AuroraLogo } from "../AuroraChrome";
import { SECTION, SITE_NAV, scrollToSection } from "./bus";

/**
 * Aurora's own header, fixed right below MatsuHub's demo bar (app/demos/layout)
 * (transparent over the tour, navy once the page scrolls). Phones get a sheet menu.
 */
export function SiteHeader() {
  const [solid, setSolid] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const read = () => setSolid(window.scrollY > 24);
    read();
    window.addEventListener("scroll", read, { passive: true });
    return () => window.removeEventListener("scroll", read);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [menu]);

  const jump = (id: string) => (event: React.MouseEvent) => {
    event.preventDefault();
    setMenu(false);
    scrollToSection(id);
  };

  return (
    <>

      <header
        data-solid={solid || menu}
        className="group/h fixed inset-x-0 top-[var(--demo-bar-h,0px)] z-[55] transition-[background-color,border-color] duration-500 data-[solid=true]:border-b data-[solid=true]:border-au-line data-[solid=true]:bg-au-bg/88 data-[solid=true]:backdrop-blur-xl"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-au-bg/70 to-transparent transition-opacity duration-500 group-data-[solid=true]/h:opacity-0"
        />
        <div className="relative mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-6 px-[var(--pad)] md:h-[60px]">
          <a href="#top" onClick={jump("top")} aria-label="Aurora Residence, início">
            <AuroraLogo />
          </a>
          <nav aria-label="Seções" className="flex items-center gap-8 max-lg:hidden">
            {SITE_NAV.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={jump(item.id)}
                className="text-[10px] leading-none font-semibold tracking-[0.26em] text-au-ink/85 uppercase transition-colors hover:text-au-gold"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <a
              href={`#${SECTION.visit}`}
              onClick={jump(SECTION.visit)}
              className="bg-au-ink px-4 py-3 text-[10px] leading-none font-bold tracking-[0.22em] text-au-bg uppercase transition-colors hover:bg-au-gold max-sm:px-3"
            >
              Agendar visita
            </a>
            <button
              type="button"
              aria-expanded={menu}
              aria-controls="aurora-menu"
              aria-label={menu ? "Fechar menu" : "Abrir menu"}
              onClick={() => setMenu((open) => !open)}
              className="relative grid h-[34px] w-[34px] place-items-center border border-au-line before:absolute before:-inset-[4px] before:content-[''] lg:hidden"
            >
              <span aria-hidden className="grid gap-[5px]">
                <i className={cn("block h-px w-4 bg-au-ink transition-transform duration-300", menu && "translate-y-[3px] rotate-45")} />
                <i className={cn("block h-px w-4 bg-au-ink transition-transform duration-300", menu && "-translate-y-[3px] -rotate-45")} />
              </span>
            </button>
          </div>
        </div>

        <nav
          id="aurora-menu"
          aria-label="Seções"
          data-open={menu}
          inert={!menu}
          className="grid overflow-hidden transition-[grid-template-rows,opacity] duration-500 ease-soft data-[open=false]:grid-rows-[0fr] data-[open=false]:opacity-0 data-[open=true]:grid-rows-[1fr] lg:hidden"
        >
          <ul className="min-h-0 px-[var(--pad)]">
            {SITE_NAV.map((item) => (
              <li key={item.id} className="border-t border-au-line">
                <a
                  href={`#${item.id}`}
                  onClick={jump(item.id)}
                  className="flex items-center justify-between py-4 font-aurora text-[22px] font-light text-au-ink"
                >
                  {item.label}
                  <span aria-hidden className="text-[14px] text-au-gold">
                    →
                  </span>
                </a>
              </li>
            ))}
            <li className="border-t border-au-line pb-4" />
          </ul>
        </nav>
      </header>
    </>
  );
}
