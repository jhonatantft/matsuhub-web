"use client";

import { useEffect, useRef, useState } from "react";
import { IRIS } from "@/content/clinica";
import { cn } from "@/lib/cn";
import { reducedMotion } from "@/lib/env";
import { book, onSite, onTour, scrollToSection } from "./bus";
import { IRIS_START, irisAnswer, type IrisAction, type IrisReply, type IrisStep } from "./iris-script";

type Message = { id: number; from: "iris" | "user"; text: string; alert?: boolean };

/**
 * Iris, the scripted AI receptionist: a floating button that opens a chat panel (bottom sheet on
 * phones). Answers come from iris-script.ts, computed from the clinic's data and agenda; every
 * message is checked for emergency and crisis words first. Labelled as a simulation; nothing is
 * sent anywhere.
 */
export function SiteIris() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replies, setReplies] = useState<IrisReply[]>([]);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [past, setPast] = useState(false);
  const [inside, setInside] = useState(false);

  const ids = useRef(0);
  const timers = useRef<number[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const openRef = useRef<() => void>(() => {});

  // phones: the button waits until the visitor has left the hero
  useEffect(() => {
    const read = () => setPast(window.scrollY > window.innerHeight * 0.6);
    read();
    window.addEventListener("scroll", read, { passive: true });
    return () => window.removeEventListener("scroll", read);
  }, []);

  // inside the tour the button would sit on the tour's own controls
  useEffect(() => onTour("elo:state", (d) => setInside(d.state !== "fachada")), []);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: reducedMotion() ? "auto" : "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (open) panelRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if (panelRef.current?.contains(document.activeElement)) launcherRef.current?.focus({ preventScroll: true });
      setOpen(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open]);

  const close = () => {
    if (panelRef.current?.contains(document.activeElement)) launcherRef.current?.focus({ preventScroll: true });
    setOpen(false);
  };

  const push = (from: Message["from"], text: string, alert?: boolean) =>
    setMessages((list) => [...list, { id: ++ids.current, from, text, alert }]);
  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
  const narrow = () => window.innerWidth < 640;

  const act = (action: IrisAction) => {
    if (action.kind === "book") book(action.prefill);
    else scrollToSection(action.to);
    if (narrow()) later(1200, () => setOpen(false));
  };

  const play = (step: IrisStep) => {
    setReplies([]);
    // safety answers show at once; the rest "types" at a reading pace
    let t = step.alert ? 120 : 260;
    step.say.forEach((line, i) => {
      later(t, () => setTyping(true));
      t += step.alert ? 350 : Math.min(1400, 480 + line.length * 8);
      later(t, () => {
        setTyping(false);
        push("iris", line, step.alert);
        if (i === step.say.length - 1) {
          setReplies(step.replies);
          if (step.action) act(step.action);
        }
      });
      t += 220;
    });
  };

  const begin = () => {
    if (started.current) return;
    started.current = true;
    play(IRIS_START);
  };

  const send = (text: string) => {
    const clean = text.trim();
    if (!clean || typing) return;
    push("user", clean);
    setDraft("");
    play(irisAnswer(clean, new Date()));
  };

  const choose = (reply: IrisReply) => {
    if (typing) return;
    if (!reply.next) return send(reply.label);
    push("user", reply.label);
    play(reply.next(new Date()));
  };

  // keep the latest handler for the bus listener below
  useEffect(() => {
    openRef.current = () => {
      setOpen(true);
      begin();
    };
  });

  // "Falar com a Iris" from the page
  useEffect(() => onSite("iris", () => openRef.current()), []);

  const toggle = () => {
    setOpen((was) => !was);
    begin();
  };

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="elo-iris"
        data-past={past}
        data-hide={inside && !past}
        data-open={open}
        className="group fixed right-4 bottom-4 z-[70] flex items-center gap-3 rounded-full border border-el-acc/25 bg-el-bg-2/95 py-2 pr-5 pl-2 text-el-ink shadow-[0_18px_50px_-14px_rgb(20_32_31/0.45)] backdrop-blur-xl transition-[opacity,translate,border-color] duration-500 ease-soft hover:border-el-acc sm:right-6 sm:bottom-6 max-sm:data-[past=false]:pointer-events-none max-sm:data-[past=false]:translate-y-4 max-sm:data-[past=false]:opacity-0 data-[hide=true]:pointer-events-none data-[hide=true]:translate-y-4 data-[hide=true]:opacity-0 data-[open=true]:pointer-events-none data-[open=true]:translate-y-4 data-[open=true]:opacity-0"
      >
        <Avatar />
        <span className="text-left leading-none">
          <span className="block font-elo text-[15px] font-medium">Fale com a {IRIS.name}</span>
          <span className="mt-1 block font-elo text-[11.5px] tracking-[0.06em] text-el-acc">IA · simulação</span>
        </span>
      </button>

      <div
        ref={panelRef}
        id="elo-iris"
        role="dialog"
        tabIndex={-1}
        aria-label={`${IRIS.name}, ${IRIS.role}`}
        data-open={open}
        inert={!open}
        className="fixed z-[75] flex flex-col overflow-hidden border border-el-line bg-el-bg-2 font-sans text-el-ink shadow-[0_30px_90px_-24px_rgb(20_32_31/0.5)] outline-none transition-[opacity,translate] duration-500 ease-soft data-[open=false]:pointer-events-none data-[open=false]:translate-y-6 data-[open=false]:opacity-0 max-sm:inset-x-0 max-sm:bottom-0 max-sm:h-[80svh] max-sm:rounded-t-[24px] max-sm:border-x-0 max-sm:border-b-0 sm:right-6 sm:bottom-6 sm:h-[min(660px,calc(100svh-140px))] sm:w-[400px] sm:rounded-[24px]"
      >
        <div className="flex items-center gap-3 border-b border-el-line bg-el-bg px-4 py-3.5">
          <Avatar />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2.5">
              <span className="font-elo text-[19px] leading-none font-medium">{IRIS.name}</span>
              <span className="rounded-full bg-el-acc/[0.1] px-2 py-1 font-elo text-[11px] leading-none text-el-acc">IA · simulação</span>
            </span>
            <span className="mt-1.5 block truncate text-[12.5px] leading-none text-el-mute">{IRIS.role}</span>
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="Fechar conversa"
            className="grid h-10 w-10 place-items-center rounded-full border border-el-ink/12 text-[14px] text-el-ink transition-colors hover:border-el-acc"
          >
            <span aria-hidden>✕</span>
          </button>
        </div>

        <div
          ref={listRef}
          aria-live="polite"
          className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-4 py-4"
          data-lenis-prevent
        >
          <p className="mb-2 self-center text-center text-[12px] leading-snug text-el-mute">
            Conversa roteirizada para demonstração.
            <br />
            Nada do que você escreve sai do seu aparelho.
          </p>
          {messages.map((m) => (
            <p
              key={m.id}
              className={cn(
                "max-w-[88%] px-3.5 py-2.5 text-[15px] leading-snug whitespace-pre-line transition-[opacity,translate] duration-500 ease-soft starting:translate-y-2 starting:opacity-0",
                m.from === "user" && "self-end rounded-[16px_16px_4px_16px] bg-el-acc text-white",
                m.from === "iris" && !m.alert && "self-start rounded-[16px_16px_16px_4px] bg-el-bg",
                m.alert && "self-start rounded-[16px_16px_16px_4px] border border-[#b3261e]/35 bg-[#fdf1ef] font-medium text-[#6e1611]",
              )}
            >
              {m.text}
            </p>
          ))}
          {typing && (
            <p aria-label={`${IRIS.name} está digitando`} className="flex gap-1 self-start rounded-[16px_16px_16px_4px] bg-el-bg px-3.5 py-3.5">
              {[0, 1, 2].map((dot) => (
                <i
                  key={dot}
                  aria-hidden
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-el-mute [animation-duration:0.9s]"
                  style={{ animationDelay: `${dot * 0.14}s` }}
                />
              ))}
            </p>
          )}
          {replies.length > 0 && (
            <div className="mt-2 flex flex-wrap justify-end gap-1.5">
              {replies.map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => choose(r)}
                  className="rounded-full border border-el-acc/40 bg-el-bg-2 px-3.5 py-2.5 text-left font-elo text-[13.5px] leading-tight text-el-acc transition-colors starting:opacity-0 hover:bg-el-acc hover:text-white"
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            send(draft);
          }}
          className="border-t border-el-line px-3 pt-3 pb-[max(10px,env(safe-area-inset-bottom))]"
        >
          <div className="flex items-center gap-2">
            <label htmlFor="elo-iris-input" className="sr-only">
              Mensagem para a {IRIS.name}
            </label>
            <input
              id="elo-iris-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={200}
              autoComplete="off"
              placeholder="Escreva uma mensagem…"
              className="min-w-0 flex-1 rounded-full bg-el-bg px-4 py-2.5 text-[16px] text-el-ink placeholder:text-el-mute focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-el-acc"
            />
            <button
              type="submit"
              aria-label="Enviar"
              disabled={!draft.trim() || typing}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-el-acc text-[16px] text-white transition-opacity disabled:opacity-40"
            >
              <span aria-hidden>↑</span>
            </button>
          </div>
          <p className="mt-2 text-center font-elo text-[12.5px] text-el-ink">Em emergência, ligue 192.</p>
        </form>
      </div>
    </>
  );
}

function Avatar() {
  return (
    <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-el-acc font-elo text-[17px] leading-none font-medium text-white">
      I
      <i aria-hidden className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-el-bg-2 bg-[#3fbf7f]" />
    </span>
  );
}
