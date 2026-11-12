"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { LangSwitch } from "@/components/layout/LangSwitch";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { SEGMENT_HREFS, SEGMENT_LIST, SEGMENT_UI } from "@/content/segments";
import { NAV } from "@/content/site";
import { cn } from "@/lib/cn";
import { dict, HOME_PATH, sectionHref, t, type Lang } from "@/lib/i18n";
import { lenisRef } from "@/lib/scroll";

/** "Soluções" sits right after this section in the desktop nav. */
const SOLUTIONS_AFTER = "services";

export function Nav({ lang = "pt" }: { lang?: Lang }) {
  const hrefs = SEGMENT_HREFS[lang];
  const d = dict(lang);
  const nav = NAV.map((item) => ({ id: item.id, href: sectionHref(item.id, lang), label: t(item.label, lang) }));
  const pathname = usePathname();
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  /** The "Soluções" dropdown is open for the page it was opened on, so navigating closes it. */
  const [solutionsAt, setSolutionsAt] = useState<string | null>(null);
  const solutions = solutionsAt === pathname;
  const lastY = useRef(0);
  const solutionsRef = useRef<HTMLLIElement>(null);
  const solutionsButton = useRef<HTMLButtonElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const openedByHover = useRef(false);

  // Glass background after the first scroll; hide on the way down, show on the way up.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setSolid(y > 24);
      if (y > 480 && y > lastY.current + 6) {
        setHidden(true);
        setSolutionsAt(null);
      } else if (y < lastY.current - 6 || y <= 480) setHidden(false);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mobile menu: lock scrolling, close on Escape.
  useEffect(() => {
    if (!open) return;
    lenisRef.current?.stop();
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      lenisRef.current?.start();
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Desktop dropdown: Escape closes and returns focus to the button; a press outside closes it.
  useEffect(() => {
    if (!solutions) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setSolutionsAt(null);
      solutionsButton.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!solutionsRef.current?.contains(e.target as Node)) setSolutionsAt(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [solutions]);

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  // Mouse users get the dropdown on hover too (with a short grace period on the way out).
  const hoverOpen = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(hoverTimer.current);
    if (!solutions) openedByHover.current = true;
    setSolutionsAt(pathname);
  };
  // A click right after hovering keeps the dropdown open instead of toggling it shut.
  const onToggle = () => {
    if (solutions && openedByHover.current) {
      openedByHover.current = false;
      return;
    }
    openedByHover.current = false;
    setSolutionsAt(solutions ? null : pathname);
  };
  const hoverClose = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setSolutionsAt(null), 160);
  };
  // Tabbing out of the dropdown closes it.
  const onBlur = (e: React.FocusEvent) => {
    if (!solutionsRef.current?.contains(e.relatedTarget as Node | null)) setSolutionsAt(null);
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-transform duration-500 ease-soft",
        hidden && !open && "-translate-y-full",
      )}
    >
      <div
        className={cn(
          "flex h-[var(--nav-h)] items-center justify-between border-b px-[var(--pad)] transition-colors duration-300",
          solid || open || solutions ? "border-line bg-bg/80 backdrop-blur-md" : "border-transparent",
        )}
      >
        <Link href={HOME_PATH[lang]} aria-label={d.nav.home} className="rounded-sm">
          <Logo />
        </Link>

        <nav aria-label={d.nav.main} className="hidden md:block">
          <ul className="flex items-center gap-8 font-mono text-xs font-medium tracking-[0.1em] uppercase">
            {nav.map((item) => (
              <Fragment key={item.href}>
                <li>
                  <a href={item.href} className="text-mute transition-colors hover:text-acc">
                    {item.label}
                  </a>
                </li>
                {item.id === SOLUTIONS_AFTER && (
                  <li ref={solutionsRef} className="relative" onPointerEnter={hoverOpen} onPointerLeave={hoverClose} onBlur={onBlur}>
                    <button
                      ref={solutionsButton}
                      type="button"
                      aria-expanded={solutions}
                      aria-controls="nav-solucoes"
                      onClick={onToggle}
                      className={cn(
                        "flex items-center gap-1.5 uppercase transition-colors hover:text-acc",
                        solutions || pathname.startsWith(hrefs.index) ? "text-acc" : "text-mute",
                      )}
                    >
                      {t(SEGMENT_UI.nav.menu, lang)}
                      <svg aria-hidden viewBox="0 0 10 6" className={cn("h-1.5 w-2.5 transition-transform duration-300", solutions && "rotate-180")}>
                        <path d="m1 1 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" />
                      </svg>
                    </button>
                    <div
                      id="nav-solucoes"
                      hidden={!solutions}
                      className="absolute top-full left-1/2 w-[min(600px,calc(100vw-2*var(--pad)))] -translate-x-1/2 pt-5"
                    >
                      <div className="overflow-hidden rounded-[20px] border border-line-2 bg-[rgb(7_13_10/0.97)] font-sans backdrop-blur-xl tracking-normal normal-case shadow-[0_40px_100px_-40px_rgb(0_0_0/0.9),0_30px_90px_-60px_rgb(185_255_75/0.45)]">
                        <p className="border-b border-line px-5 py-3 font-mono text-[10.5px] tracking-[0.16em] text-mute uppercase">
                          {t(SEGMENT_UI.nav.heading, lang)}
                        </p>
                        <ul className="grid grid-cols-2 gap-px bg-line">
                          {SEGMENT_LIST.map((segment, i) => (
                            <li key={segment.id} className="bg-[rgb(7_13_10/0.96)]">
                              <Link
                                href={hrefs.segment(segment.id)}
                                onClick={() => setSolutionsAt(null)}
                                aria-current={pathname === hrefs.segment(segment.id) ? "page" : undefined}
                                className="group/item flex h-full gap-3 px-5 py-4 transition-colors hover:bg-acc/[0.06] focus-visible:bg-acc/[0.06] focus-visible:outline-offset-[-2px]"
                              >
                                <span className="mt-0.5 font-mono text-[10.5px] text-acc">0{i + 1}</span>
                                <span className="min-w-0">
                                  <span className="flex items-center gap-1.5 font-display text-[15px] font-semibold tracking-[-0.01em] text-ink group-hover/item:text-acc group-aria-[current=page]/item:text-acc">
                                    {t(segment.name, lang)}
                                    <span aria-hidden className="text-acc opacity-0 transition-[opacity,translate] duration-300 group-hover/item:translate-x-0.5 group-hover/item:opacity-100">
                                      →
                                    </span>
                                  </span>
                                  <span className="mt-1 block text-[13px] leading-snug text-mute">{t(segment.nav, lang)}</span>
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                        <Link
                          href={hrefs.index}
                          onClick={() => setSolutionsAt(null)}
                          className="flex items-center justify-between border-t border-line px-5 py-3.5 font-mono text-[11px] tracking-[0.12em] text-acc uppercase transition-colors hover:bg-acc/[0.06] focus-visible:outline-offset-[-2px]"
                        >
                          {t(SEGMENT_UI.nav.all, lang)}
                          <span aria-hidden>→</span>
                        </Link>
                      </div>
                    </div>
                  </li>
                )}
              </Fragment>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <LangSwitch lang={lang} />
          <Button href={sectionHref("contact", lang)} size="sm" className="hidden sm:inline-flex">
            {d.common.startProject}
          </Button>
          <button
            type="button"
            className="relative h-10 w-10 rounded-full border border-line-2 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? d.nav.closeMenu : d.nav.openMenu}
            onClick={() => setOpen((o) => !o)}
          >
            <span
              className={cn(
                "absolute top-1/2 left-1/2 h-px w-4 -translate-x-1/2 bg-ink transition-transform duration-300",
                open ? "rotate-45" : "-translate-y-[4px]",
              )}
            />
            <span
              className={cn(
                "absolute top-1/2 left-1/2 h-px w-4 -translate-x-1/2 bg-ink transition-transform duration-300",
                open ? "-rotate-45" : "translate-y-[4px]",
              )}
            />
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        hidden={!open}
        className="h-[calc(100svh-var(--nav-h))] overflow-y-auto bg-bg/95 px-[var(--pad)] py-10 backdrop-blur-xl md:hidden"
      >
        <nav aria-label={d.nav.menu}>
          <ul className="grid gap-2">
            {nav.map((item, i) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-baseline gap-4 border-b border-line py-5 font-display text-3xl font-semibold tracking-tight"
                >
                  <span className="font-mono text-xs text-acc">0{i + 1}</span>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="mt-10">
            <p id="mobile-solucoes" className="label">
              {t(SEGMENT_UI.nav.menu, lang)}
            </p>
            <ul aria-labelledby="mobile-solucoes" className="mt-3 grid grid-cols-1">
              {SEGMENT_LIST.map((segment) => (
                <li key={segment.id}>
                  <Link
                    href={hrefs.segment(segment.id)}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between gap-4 border-b border-line py-3.5"
                  >
                    <span className="min-w-0">
                      <span className="block font-display text-[19px] font-semibold tracking-[-0.01em]">{t(segment.name, lang)}</span>
                      <span className="mt-0.5 block text-[13.5px] leading-snug text-mute">{t(segment.nav, lang)}</span>
                    </span>
                    <span aria-hidden className="text-acc">
                      →
                    </span>
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={hrefs.index}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between py-4 font-mono text-[11px] tracking-[0.12em] text-acc uppercase"
                >
                  {t(SEGMENT_UI.nav.all, lang)}
                  <span aria-hidden>→</span>
                </Link>
              </li>
            </ul>
          </div>
        </nav>
        <Button href={sectionHref("contact", lang)} className="mt-8 w-full" onClick={() => setOpen(false)}>
          {d.common.startProject}
        </Button>
      </div>
    </header>
  );
}
