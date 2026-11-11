"use client";

import { useDeferredValue, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { brl } from "@/content/pulso";
import { cn } from "@/lib/cn";
import { Eyebrow, Photo, useSearch } from "./bits";
import { chipsOf, EXAMPLES, isEmptyIntent, nearest, parseIntent, rankProducts, withoutChips, type ChipKey } from "./intent";
import { addToCart, noteInterest, scrollToSection, SECTION, searchStore, setSearch, short } from "./store";
import { useFlip } from "./useFlip";

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognitionCtor = new () => Recognition;

const recognitionCtor = (): RecognitionCtor | undefined => {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

/** Speech input is offered only when the browser has the API and the page may use the microphone. */
function micAvailable() {
  if (!recognitionCtor()) return false;
  const policy = (document as Document & { featurePolicy?: { allowsFeature: (f: string) => boolean } }).featurePolicy;
  return policy ? policy.allowsFeature("microphone") : true;
}
const noop = () => () => {};

const UNDERSTANDS = ["uso", "orçamento", "bateria", "peso", "água", "ruído", "latência", "categoria", "compatível com"];

/** "Pergunte à loja": intent search parsed in the browser, re-ranking the catalogue with reasons. */
export function SiteSearch() {
  const { text, focus } = useSearch();
  const query = useDeferredValue(text);
  const [removed, setRemoved] = useState<{ text: string; keys: ReadonlySet<ChipKey> }>({ text: "", keys: new Set() });
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<Recognition | null>(null);
  const mic = useSyncExternalStore(noop, micAvailable, () => false);

  const keys = removed.text === query ? removed.keys : new Set<ChipKey>();
  const parsed = parseIntent(query);
  const intent = withoutChips(parsed, keys);
  const chips = chipsOf(intent);
  const active = !isEmptyIntent(intent);
  const ranked = active ? rankProducts(intent) : [];
  const fits = ranked.filter((r) => r.fits);
  const near = active && !fits.length ? nearest(ranked, intent) : null;
  // the matches, then near misses (dimmed, with what they lack) to fill the row
  const shown = active ? ranked.slice(0, Math.max(4, Math.ceil(fits.length / 4) * 4)) : [];
  const listRef = useFlip<HTMLOListElement>(shown.map((r) => `${r.product.id}${r.fits ? "+" : "-"}`).join(","));

  // ⌘K / Ctrl+K from anywhere
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchStore.set({ ...searchStore.get(), focus: searchStore.get().focus + 1 });
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  // header button, ⌘K and Eco ask for focus
  useEffect(() => {
    if (!focus) return;
    scrollToSection(SECTION.search, () => inputRef.current?.focus({ preventScroll: true }));
  }, [focus]);

  // what the visitor searched counts as interest, once the query settles
  useEffect(() => {
    if (!active) return;
    const ids = fits.slice(0, 3).map((r) => r.product.id);
    const t = window.setTimeout(() => ids.forEach((id, i) => noteInterest(id, "search", 1 - i * 0.25)), 1200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, keys.size]);

  useEffect(() => () => recRef.current?.stop(), []);

  const listen = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      const said = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(" ");
      setSearch(said);
    };
    rec.onerror = (e) => setMicError(e.error === "not-allowed" ? "O navegador não liberou o microfone." : "Não consegui ouvir. Tente de novo.");
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setMicError("");
    setListening(true);
    rec.start();
  };

  const drop = (key: ChipKey) => setRemoved({ text: query, keys: new Set([...keys, key]) });

  return (
    <section id="busca" aria-labelledby="busca-title" className="relative scroll-mt-[calc(var(--demo-bar-h,0px)+56px)] px-[var(--pad)] py-[clamp(72px,9vw,128px)]">
      <div className="mx-auto max-w-[1320px]">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
          <div className="max-w-[640px]">
            <Eyebrow n="02">Pergunte à loja</Eyebrow>
            <h2 id="busca-title" className="mt-5 font-pulso text-[clamp(32px,4.4vw,60px)] leading-[0.98] font-semibold tracking-[-0.05em] text-pu-ink">
              Diga o que você precisa.
              <br />
              <span className="text-pu-mute">A loja entende.</span>
            </h2>
          </div>
          <p className="flex items-center gap-2 rounded-full border border-pu-line bg-white/70 px-3.5 py-2 font-mono text-[10.5px] leading-none tracking-[0.06em] text-pu-mute">
            <i aria-hidden className="h-1.5 w-1.5 rounded-full bg-[linear-gradient(135deg,var(--color-pu-acc),var(--color-pu-acc-2))]" />
            busca por intenção — roda no seu navegador
          </p>
        </div>

        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            if (fits[0]) document.getElementById(`busca-${fits[0].product.id}`)?.focus();
          }}
          className="relative mt-10 rounded-[22px] bg-[linear-gradient(120deg,rgb(91_75_255/0.5),rgb(0_200_240/0.45))] p-px shadow-[0_30px_80px_-40px_rgb(91_75_255/0.45)]"
        >
          <div className="flex items-center gap-2 rounded-[21px] bg-white/95 py-2 pr-2 pl-5 backdrop-blur-xl">
            <svg viewBox="0 0 16 16" aria-hidden className="h-4 w-4 shrink-0 text-pu-acc">
              <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <label htmlFor="pulso-busca" className="sr-only">
              Descreva o que você procura
            </label>
            <input
              ref={inputRef}
              id="pulso-busca"
              type="search"
              value={text}
              onChange={(event) => setSearch(event.target.value)}
              maxLength={160}
              autoComplete="off"
              enterKeyHint="search"
              placeholder="Ex.: fone para correr com bateria longa até R$ 800"
              className="h-12 min-w-0 flex-1 bg-transparent text-[16px] text-pu-ink outline-none placeholder:text-pu-mute/70 sm:text-[17px] [&::-webkit-search-cancel-button]:hidden"
            />
            {text && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  inputRef.current?.focus();
                }}
                aria-label="Limpar busca"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] text-pu-mute transition-colors hover:bg-pu-bg hover:text-pu-ink"
              >
                <span aria-hidden>✕</span>
              </button>
            )}
            {mic && (
              <button
                type="button"
                onClick={listen}
                aria-pressed={listening}
                aria-label={listening ? "Parar de ouvir" : "Falar a busca"}
                className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-pu-line text-pu-ink transition-colors hover:border-pu-acc/50 aria-pressed:border-pu-acc aria-pressed:bg-pu-acc aria-pressed:text-white"
              >
                {listening && <i aria-hidden className="absolute inset-0 animate-ping rounded-full bg-pu-acc/30" />}
                <svg viewBox="0 0 16 16" aria-hidden className="relative h-4 w-4">
                  <rect x="5.5" y="1.5" width="5" height="8.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M3 7.5a5 5 0 0 0 10 0M8 12.5v2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
            )}
            <kbd className="mr-1 rounded-full border border-pu-line bg-pu-bg px-2.5 py-1.5 font-mono text-[10.5px] leading-none text-pu-mute max-md:hidden">⌘K</kbd>
          </div>
        </form>
        {micError && <p className="mt-2 text-[12px] text-[#c2410c]">{micError}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setSearch(q)}
              aria-pressed={text === q}
              className="rounded-full border border-pu-line bg-white/50 px-3.5 py-2 text-left text-[12.5px] leading-snug text-pu-ink/80 transition-colors hover:border-pu-acc/40 hover:text-pu-ink aria-pressed:border-pu-acc aria-pressed:bg-pu-acc/[0.06] aria-pressed:text-pu-acc"
            >
              “{q}”
            </button>
          ))}
        </div>

        <div className="mt-8 min-h-[44px] border-t border-pu-line pt-5" aria-live="polite">
          {!active ? (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-2 text-[12.5px] text-pu-mute">
              <span className="mr-1 font-mono text-[10.5px] tracking-[0.14em] uppercase">Entende</span>
              {UNDERSTANDS.map((u) => (
                <span key={u} className="rounded-full border border-dashed border-pu-line px-2.5 py-1">
                  {u}
                </span>
              ))}
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 font-mono text-[10.5px] tracking-[0.14em] text-pu-mute uppercase">Entendi</span>
              {chips.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => drop(c.key)}
                  aria-label={`Remover: ${c.label}`}
                  className="group flex items-center gap-1.5 rounded-full bg-pu-ink py-1.5 pr-2 pl-3 text-[12.5px] leading-none text-white transition-[opacity,scale] duration-300 starting:scale-90 starting:opacity-0"
                >
                  {c.label}
                  <span aria-hidden className="grid h-4 w-4 place-items-center rounded-full bg-white/15 text-[9px] transition-colors group-hover:bg-white/30">
                    ✕
                  </span>
                </button>
              ))}
              {keys.size > 0 && (
                <button type="button" onClick={() => setRemoved({ text: "", keys: new Set() })} className="text-[12px] text-pu-acc underline-offset-4 hover:underline">
                  restaurar
                </button>
              )}
              <span className="ml-auto font-mono text-[10.5px] tracking-[0.08em] text-pu-mute">
                {fits.length} de {ranked.length} atendem
              </span>
            </div>
          )}

          {near && (
            <p className="mt-5 rounded-[16px] border border-pu-acc/25 bg-pu-acc/[0.05] px-4 py-3.5 text-[14px] leading-relaxed text-pu-ink">
              Nada no catálogo atende a tudo. O mais próximo é o <b className="font-semibold">{near.product.name}</b> ({brl(near.product.price)}) — para chegar
              nele, relaxei {near.relaxed.join(" e ")}.
            </p>
          )}

          {shown.length > 0 && (
            <ol ref={listRef} className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {shown.map((r, i) => (
                <li
                  key={r.product.id}
                  data-flip={r.product.id}
                  className={cn(
                    "group relative flex gap-3 rounded-[18px] border bg-white/80 p-2.5 transition-[opacity,border-color] duration-500",
                    r.fits ? "border-pu-line" : "border-transparent bg-white/40 opacity-60",
                    r.fits && i === 0 && "border-pu-acc/40 shadow-[0_18px_40px_-28px_rgb(91_75_255/0.6)]",
                  )}
                >
                  <Photo product={r.product} sizes="88px" className="h-[88px] w-[88px] shrink-0 rounded-[12px]" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="flex items-baseline justify-between gap-2">
                      <a
                        id={`busca-${r.product.id}`}
                        href={`#p-${r.product.id}`}
                        onClick={(event) => {
                          event.preventDefault();
                          noteInterest(r.product.id, "view");
                          scrollToSection(`p-${r.product.id}`);
                        }}
                        className="truncate text-[14px] font-semibold text-pu-ink outline-offset-2 after:absolute after:inset-0 after:rounded-[18px]"
                      >
                        {short(r.product)}
                      </a>
                      <span className="shrink-0 text-[13px] text-pu-ink tabular-nums">{brl(r.product.price)}</span>
                    </p>
                    <p className={cn("mt-1.5 line-clamp-3 text-[12px] leading-snug", r.fits ? "text-pu-mute" : "text-[#b45309]")}>
                      <span aria-hidden className={r.fits ? "text-pu-acc" : ""}>
                        {r.fits ? "✓ " : "✕ "}
                      </span>
                      {r.line}
                    </p>
                    {r.fits && (
                      <button
                        type="button"
                        onClick={() => addToCart(r.product.id)}
                        className="relative z-[1] mt-auto self-start pt-1.5 text-[12px] font-medium text-pu-acc hover:underline"
                      >
                        + Adicionar
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
