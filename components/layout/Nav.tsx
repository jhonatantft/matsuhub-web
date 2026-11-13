"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LangSwitch } from "@/components/layout/LangSwitch";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { CUSTOM } from "@/content/custom";
import { LAB_EXPERIMENTS, LAB_EXPLAINERS, LAB_HREFS, LAB_ITEMS, LAB_NOTES, LAB_UI, type LabItem } from "@/content/lab";
import { SEGMENT_HREFS, SEGMENT_LIST, SEGMENT_UI } from "@/content/segments";
import { NAV, type NavSection } from "@/content/site";
import { cn } from "@/lib/cn";
import { dict, HOME_PATH, sectionHref, sectionId, t, type Lang, type SectionKey } from "@/lib/i18n";
import { lenisRef } from "@/lib/scroll";

/**
 * The header, left to right: what we do (Serviços), for whom, each with its live demo (Soluções),
 * how we work (Processo), and the engineering behind it (Lab). Every destination appears once.
 */
type MenuId = "solutions" | "lab";
type ItemId = "services" | MenuId | "process";

/** Which header item lights up while each homepage section crosses the middle of the screen. */
const SPY: Record<SectionKey, ItemId | null> = {
  services: "services",
  demos: "solutions",
  agents: "services",
  process: "process",
  contact: null,
};

const chevron = (open: boolean) => (
  <svg aria-hidden viewBox="0 0 10 6" className={cn("h-1.5 w-2.5 transition-transform duration-300", open && "rotate-180")}>
    <path d="m1 1 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

/** Top-level item: lime while hovered/open or current; the underline marks only where you are. */
const itemClass = (lit: boolean, current: boolean) =>
  cn(
    "relative flex items-center gap-1.5 uppercase transition-colors hover:text-acc",
    "after:absolute after:inset-x-0 after:-bottom-2 after:h-px after:origin-left after:bg-acc after:transition-transform after:duration-500 after:ease-soft",
    lit || current ? "text-acc" : "text-mute",
    current ? "after:scale-x-100" : "after:scale-x-0",
  );

const panelClass =
  "overflow-hidden rounded-[20px] border border-line-2 bg-[rgb(7_13_10/0.97)] font-sans tracking-normal normal-case backdrop-blur-xl";
const footLinkClass =
  "flex items-center justify-between border-t border-line px-5 py-3.5 font-mono text-[11px] tracking-[0.12em] text-acc uppercase transition-colors hover:bg-acc/[0.06] focus-visible:outline-offset-[-2px]";

export function Nav({ lang = "pt" }: { lang?: Lang }) {
  const hrefs = SEGMENT_HREFS[lang];
  const lab = LAB_HREFS[lang];
  const d = dict(lang);
  const section = (id: NavSection) => ({ href: sectionHref(id, lang), label: t(NAV.find((item) => item.id === id)!.label, lang) });
  const services = section("services");
  const processLink = section("process");
  const pathname = usePathname();
  const onHome = pathname === HOME_PATH[lang];
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [inView, setInView] = useState<ItemId | null>(null);
  /** A dropdown is open for the page it was opened on, so navigating closes it. */
  const [menuAt, setMenuAt] = useState<{ id: MenuId; path: string } | null>(null);
  const openMenu = menuAt && menuAt.path === pathname ? menuAt.id : null;
  const lastY = useRef(0);
  const solutionsRef = useRef<HTMLLIElement>(null);
  const solutionsButton = useRef<HTMLButtonElement>(null);
  const labRef = useRef<HTMLLIElement>(null);
  const labButton = useRef<HTMLButtonElement>(null);
  const menuRefs = { solutions: solutionsRef, lab: labRef };
  const menuButtons = { solutions: solutionsButton, lab: labButton };
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const openedByHover = useRef(false);

  /** Where you are: the section in view on the homepage, the section of the site anywhere else. */
  const current = (id: ItemId) => {
    if (onHome) return inView === id;
    if (id === "solutions") return pathname.startsWith(hrefs.index);
    if (id === "lab") return pathname.startsWith(lab.index);
    return false;
  };

  // Glass background after the first scroll; hide on the way down, show on the way up.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setSolid(y > 24);
      if (y > 480 && y > lastY.current + 6) {
        setHidden(true);
        setMenuAt(null);
      } else if (y < lastY.current - 6 || y <= 480) setHidden(false);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Homepage: follow the section crossing the middle of the screen.
  useEffect(() => {
    if (!onHome) return;
    const keyOf = new Map<Element, SectionKey>();
    for (const key of Object.keys(SPY) as SectionKey[]) {
      const el = document.getElementById(sectionId(key, lang));
      if (el) keyOf.set(el, key);
    }
    let here: SectionKey | null = null;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const key = keyOf.get(entry.target) ?? null;
          if (entry.isIntersecting) here = key;
          else if (here === key) here = null;
        }
        setInView(here ? SPY[here] : null);
      },
      { rootMargin: "-45% 0px -54% 0px" },
    );
    keyOf.forEach((_, el) => io.observe(el));
    return () => io.disconnect();
  }, [onHome, lang]);

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

  // Desktop dropdowns: Escape closes and returns focus to the button; a press outside closes it.
  useEffect(() => {
    if (!openMenu) return;
    const li = openMenu === "lab" ? labRef : solutionsRef;
    const button = openMenu === "lab" ? labButton : solutionsButton;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenuAt(null);
      button.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!li.current?.contains(e.target as Node)) setMenuAt(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [openMenu]);

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  // Mouse users get a dropdown on hover too (with a short grace period on the way out).
  const hoverOpen = (id: MenuId) => (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(hoverTimer.current);
    if (openMenu !== id) openedByHover.current = true;
    setMenuAt({ id, path: pathname });
  };
  // A click right after hovering keeps the dropdown open instead of toggling it shut.
  const onToggle = (id: MenuId) => () => {
    if (openMenu === id && openedByHover.current) {
      openedByHover.current = false;
      return;
    }
    openedByHover.current = false;
    setMenuAt(openMenu === id ? null : { id, path: pathname });
  };
  const hoverClose = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setMenuAt(null), 160);
  };
  // Tabbing out of a dropdown closes it.
  const onBlur = (id: MenuId) => (e: React.FocusEvent) => {
    if (!menuRefs[id].current?.contains(e.relatedTarget as Node | null)) setMenuAt(null);
  };
  const close = () => setMenuAt(null);
  const closeMobile = () => setOpen(false);

  /** A top-level dropdown: the button and its panel, centred under it. */
  const dropdown = (id: MenuId, label: string, panelId: string, width: string, panel: ReactNode) => (
    <li ref={menuRefs[id]} className="relative" onPointerEnter={hoverOpen(id)} onPointerLeave={hoverClose} onBlur={onBlur(id)}>
      <button
        ref={menuButtons[id]}
        type="button"
        aria-expanded={openMenu === id}
        aria-controls={panelId}
        onClick={onToggle(id)}
        className={itemClass(openMenu === id, current(id))}
      >
        {label}
        {chevron(openMenu === id)}
      </button>
      <div
        id={panelId}
        hidden={openMenu !== id}
        className={cn("absolute top-full left-1/2 -translate-x-1/2 pt-5", width)}
      >
        {panel}
      </div>
    </li>
  );

  const sectionLink = (id: ItemId, item: { href: string; label: string }) => (
    <li>
      <a href={item.href} aria-current={current(id) ? "location" : undefined} className={itemClass(false, current(id))}>
        {item.label}
      </a>
    </li>
  );

  const solutionsPanel = (
    <div className={cn(panelClass, "shadow-[0_40px_100px_-40px_rgb(0_0_0/0.9),0_30px_90px_-60px_rgb(185_255_75/0.45)]")}>
      <p className="border-b border-line px-5 py-3 font-mono text-[10.5px] tracking-[0.16em] text-mute uppercase">{t(SEGMENT_UI.nav.heading, lang)}</p>
      <ul className="grid grid-cols-2 gap-px bg-line">
        {SEGMENT_LIST.map((segment, i) => (
          <li
            key={segment.id}
            className="group/item relative flex gap-3 bg-[rgb(7_13_10/0.96)] px-5 py-4 transition-colors hover:bg-acc/[0.06]"
          >
            <span aria-hidden className="mt-0.5 font-mono text-[10.5px] text-acc">
              0{i + 1}
            </span>
            <span className="min-w-0">
              {/* The whole cell opens the solution; the demo link sits on top of it. */}
              <Link
                href={hrefs.segment(segment.id)}
                onClick={close}
                aria-current={pathname === hrefs.segment(segment.id) ? "page" : undefined}
                className="flex items-center gap-1.5 font-display text-[15px] font-semibold tracking-[-0.01em] text-ink group-hover/item:text-acc after:absolute after:inset-0 aria-[current=page]:text-acc"
              >
                {t(segment.name, lang)}
                <span aria-hidden className="text-acc opacity-0 transition-[opacity,translate] duration-300 group-hover/item:translate-x-0.5 group-hover/item:opacity-100">
                  →
                </span>
              </Link>
              <span className="mt-1 block text-[13px] leading-snug text-mute">{t(segment.nav, lang)}</span>
              <Link
                href={hrefs.demo(segment.id)}
                onClick={close}
                className="relative z-10 mt-2.5 inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.1em] text-acc-2/85 uppercase transition-colors hover:text-acc"
              >
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
                {t(SEGMENT_UI.nav.demo, lang)} · {segment.demo.brand}
              </Link>
            </span>
          </li>
        ))}
      </ul>
      <Link
        href={hrefs.custom}
        onClick={close}
        aria-current={pathname === hrefs.custom ? "page" : undefined}
        className="group/item relative flex items-center gap-3 overflow-hidden border-t border-line px-5 py-4 transition-colors hover:bg-acc/[0.06] focus-visible:bg-acc/[0.06] focus-visible:outline-offset-[-2px]"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgb(185_255_75/0.06)_1px,transparent_1px),linear-gradient(90deg,rgb(185_255_75/0.06)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(90deg,transparent_35%,black)]"
        />
        <span className="relative mt-0.5 self-start font-mono text-[10.5px] text-acc">05</span>
        <span className="relative min-w-0 flex-1">
          <span className="flex items-center gap-1.5 font-display text-[15px] font-semibold tracking-[-0.01em] text-ink group-hover/item:text-acc group-aria-[current=page]/item:text-acc">
            {t(CUSTOM.name, lang)}
            <span aria-hidden className="text-acc opacity-0 transition-[opacity,translate] duration-300 group-hover/item:translate-x-0.5 group-hover/item:opacity-100">
              →
            </span>
          </span>
          <span className="mt-1 block text-[13px] leading-snug text-mute">{t(CUSTOM.nav, lang)}</span>
          <span className="mt-2 block font-mono text-[10.5px] tracking-[0.1em] text-acc-2/80 uppercase">{t(CUSTOM.navTags, lang)}</span>
        </span>
        <svg aria-hidden viewBox="0 0 64 44" className="relative hidden h-11 w-16 shrink-0 text-acc sm:block">
          <path d="M12 22h14M38 22l12-12M38 22l12 12M26 22h12" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.2" />
          <rect x="2" y="16" width="12" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <rect x="26" y="16" width="12" height="12" rx="3" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.2" />
          <rect x="50" y="4" width="12" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <rect x="50" y="28" width="12" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <circle r="1.8" fill="currentColor" className="motion-reduce:hidden">
            <animateMotion dur="2.4s" repeatCount="indefinite" path="M8 22H32L56 10" />
          </circle>
          <circle r="1.8" fill="var(--color-acc-2)" className="motion-reduce:hidden">
            <animateMotion dur="2.4s" begin="1.2s" repeatCount="indefinite" path="M8 22H32L56 34" />
          </circle>
        </svg>
      </Link>
      <Link href={hrefs.index} onClick={close} className={footLinkClass}>
        {t(SEGMENT_UI.nav.all, lang)}
        <span aria-hidden>→</span>
      </Link>
    </div>
  );

  const labPanel = (
    <div className={cn(panelClass, "shadow-[0_40px_100px_-40px_rgb(0_0_0/0.9),0_30px_90px_-60px_rgb(62_242_196/0.45)]")}>
      <p className="border-b border-line px-5 py-3 font-mono text-[10.5px] tracking-[0.16em] text-mute uppercase">{t(LAB_UI.nav.heading, lang)}</p>
      <div className="grid grid-cols-2 gap-px bg-line">
        {(
          [
            [[LAB_UI.nav.explainers, LAB_EXPLAINERS]],
            [
              [LAB_UI.nav.experiments, LAB_EXPERIMENTS],
              [LAB_UI.nav.notes, LAB_NOTES],
            ],
          ] as const
        ).map((groups, col) => (
          <div key={col} className="bg-[rgb(7_13_10/0.96)] p-2">
            {groups.map(([heading, items]) => (
              <div key={heading.pt}>
                <p className="px-3 pt-2 pb-1 font-mono text-[10px] tracking-[0.14em] text-acc uppercase">{t(heading, lang)}</p>
                <ul>
                  {items.map((item: LabItem) => (
                    <li key={item.id}>
                      <Link
                        href={lab.item(item.id)}
                        onClick={close}
                        aria-current={pathname === lab.item(item.id) ? "page" : undefined}
                        className="group/item block rounded-[12px] px-3 py-2.5 transition-colors hover:bg-acc/[0.06] focus-visible:bg-acc/[0.06] focus-visible:outline-offset-[-2px]"
                      >
                        <span className="block font-display text-[14px] leading-snug font-semibold tracking-[-0.01em] text-ink group-hover/item:text-acc group-aria-[current=page]/item:text-acc">
                          {t(item.title, lang)} {t(item.accent, lang)}
                        </span>
                        {item.kind !== "explainer" && (
                          <span className="mt-1 block font-mono text-[10px] tracking-[0.08em] text-mute/80 uppercase">{item.tags.slice(0, 3).join(" · ")}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
      <Link href={lab.index} onClick={close} className={footLinkClass}>
        {t(LAB_UI.nav.all, lang)}
        <span aria-hidden>→</span>
      </Link>
    </div>
  );

  /** Mobile: a numbered top-level row. Page rows (Soluções, Lab) end in an arrow. */
  const mobileTop = (n: number, item: { href: string; label: string }, page: boolean) => {
    const inner = (
      <>
        <span className="font-mono text-xs text-acc">0{n}</span>
        <span className="flex-1">{item.label}</span>
        {page && (
          <span aria-hidden className="text-xl text-acc">
            →
          </span>
        )}
      </>
    );
    const cls = "flex items-baseline gap-4 border-b border-line py-5 font-display text-3xl font-semibold tracking-tight";
    return page ? (
      <Link href={item.href} onClick={closeMobile} className={cls}>
        {inner}
      </Link>
    ) : (
      <a href={item.href} onClick={closeMobile} className={cls}>
        {inner}
      </a>
    );
  };
  const mobileSub = "relative flex items-center justify-between gap-4 border-b border-line py-3.5 pl-8";

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
          solid || open || openMenu ? "border-line bg-bg/80 backdrop-blur-md" : "border-transparent",
        )}
      >
        <Link href={HOME_PATH[lang]} aria-label={d.nav.home} className="rounded-sm">
          <Logo />
        </Link>

        <nav aria-label={d.nav.main} className="hidden lg:block">
          <ul className="flex items-center gap-9 font-mono text-xs font-medium tracking-[0.1em] uppercase">
            {sectionLink("services", services)}
            {dropdown("solutions", t(SEGMENT_UI.nav.menu, lang), "nav-solucoes", "w-[620px]", solutionsPanel)}
            {sectionLink("process", processLink)}
            {dropdown("lab", t(LAB_UI.name, lang), "nav-lab", "w-[600px]", labPanel)}
          </ul>
        </nav>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <LangSwitch lang={lang} />
          <Button href={sectionHref("contact", lang)} size="sm" className="hidden sm:inline-flex">
            {d.common.startProject}
          </Button>
          <button
            type="button"
            className="relative h-10 w-10 rounded-full border border-line-2 lg:hidden"
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
        className="h-[calc(100svh-var(--nav-h))] overflow-y-auto bg-bg/95 px-[var(--pad)] py-6 backdrop-blur-xl lg:hidden"
      >
        <nav aria-label={d.nav.menu}>
          <ul>
            <li>{mobileTop(1, services, false)}</li>
            <li>
              {mobileTop(2, { href: hrefs.index, label: t(SEGMENT_UI.nav.menu, lang) }, true)}
              <ul>
                {SEGMENT_LIST.map((segment) => (
                  <li key={segment.id} className={mobileSub}>
                    <span className="min-w-0">
                      <Link
                        href={hrefs.segment(segment.id)}
                        onClick={closeMobile}
                        className="block font-display text-[18px] font-semibold tracking-[-0.01em] after:absolute after:inset-0"
                      >
                        {t(segment.name, lang)}
                      </Link>
                      <span className="mt-0.5 block text-[13.5px] leading-snug text-mute">{t(segment.nav, lang)}</span>
                      <Link
                        href={hrefs.demo(segment.id)}
                        onClick={closeMobile}
                        className="relative z-10 mt-2 inline-flex items-center gap-2 py-1 font-mono text-[10.5px] tracking-[0.1em] text-acc-2 uppercase"
                      >
                        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                        {t(SEGMENT_UI.nav.demo, lang)} · {segment.demo.brand}
                      </Link>
                    </span>
                    <span aria-hidden className="text-acc">
                      →
                    </span>
                  </li>
                ))}
                <li>
                  <Link href={hrefs.custom} onClick={closeMobile} className={mobileSub}>
                    <span className="min-w-0">
                      <span className="block font-display text-[18px] font-semibold tracking-[-0.01em]">{t(CUSTOM.name, lang)}</span>
                      <span className="mt-0.5 block text-[13.5px] leading-snug text-mute">{t(CUSTOM.nav, lang)}</span>
                    </span>
                    <span aria-hidden className="text-acc">
                      →
                    </span>
                  </Link>
                </li>
              </ul>
            </li>
            <li>{mobileTop(3, processLink, false)}</li>
            <li>
              {mobileTop(4, { href: lab.index, label: t(LAB_UI.name, lang) }, true)}
              <ul>
                {LAB_ITEMS.map((item) => (
                  <li key={item.id}>
                    <Link href={lab.item(item.id)} onClick={closeMobile} className={mobileSub}>
                      <span className="min-w-0">
                        <span className="block font-display text-[17px] leading-snug font-semibold tracking-[-0.01em]">
                          {t(item.title, lang)} {t(item.accent, lang)}
                        </span>
                        <span className="mt-0.5 block font-mono text-[10.5px] tracking-[0.08em] text-mute uppercase">{t(LAB_UI.kind[item.kind], lang)}</span>
                      </span>
                      <span aria-hidden className="text-acc">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          </ul>
        </nav>
        <Button href={sectionHref("contact", lang)} className="mt-8 w-full" onClick={closeMobile}>
          {d.common.startProject}
        </Button>
      </div>
    </header>
  );
}
