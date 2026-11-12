"use client";

import { useEffect, useRef, useState } from "react";
import { ELO } from "@/content/clinica";
import { onSite, scrollToSection, SECTION, type Booked } from "./bus";
import { BTN, BTN_GHOST, EloHeading, EloSection, LINK } from "./ui";

type Notes = { name: string; reason: string; allergies: string; noAllergies: boolean; meds: string; questions: string };
type Sheet = Notes & { made: string; booked: Booked | null };

const EMPTY: Notes = { name: "", reason: "", allergies: "", noAllergies: false, meds: "", questions: "" };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function rows(sheet: Sheet): [string, string][] {
  return [
    ["Paciente", sheet.name.trim() || "—"],
    ["Consulta", sheet.booked?.label ?? "Ainda não agendada"],
    ["Motivo da consulta", sheet.reason.trim() || "—"],
    ["Alergias", sheet.noAllergies ? "Não tenho alergias conhecidas" : sheet.allergies.trim() || "—"],
    ["Remédios em uso", sheet.meds.trim() || "—"],
    ["Perguntas para o profissional", sheet.questions.trim() || "—"],
  ];
}

/**
 * "Pré-consulta": a local-only form that becomes a printable summary to bring to the visit.
 * Nothing is sent or stored: no fetch, no storage, plain React state that is gone on reload.
 * Printing goes through a throwaway iframe that holds only the summary (text escaped).
 */
export function SitePrecheck() {
  const [notes, setNotes] = useState<Notes>(EMPTY);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [booked, setBooked] = useState<Booked | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => onSite("booked", setBooked), []);

  const set = <K extends keyof Notes>(k: K, v: Notes[K]) => setNotes((n) => ({ ...n, [k]: v }));
  const empty = !notes.reason.trim() && !notes.allergies.trim() && !notes.noAllergies && !notes.meds.trim() && !notes.questions.trim();

  const make = () => {
    const made = new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    setSheet({ ...notes, made, booked });
    window.setTimeout(() => sheetRef.current?.focus({ preventScroll: false }), 30);
  };

  const print = () => {
    if (!sheet) return;
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) return frame.remove();
    doc.open();
    doc.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Pré-consulta · ${esc(ELO.full)}</title>
<style>body{font:15px/1.5 system-ui,sans-serif;color:#14201f;margin:32px}h1{font-size:22px;margin:0 0 4px}p.meta{color:#5c6866;margin:0 0 24px}
dl{margin:0}dt{font-weight:600;margin-top:16px}dd{margin:4px 0 0;white-space:pre-wrap}footer{margin-top:32px;color:#5c6866;font-size:12px}</style></head>
<body><h1>Pré-consulta · ${esc(ELO.full)}</h1><p class="meta">Resumo preparado pelo paciente em ${esc(sheet.made)} · ${esc(ELO.address)}</p>
<dl>${rows(sheet)
      .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
      .join("")}</dl>
<footer>Anotações do próprio paciente, para levar à consulta. Site-demo MatsuHub: clínica fictícia.</footer></body></html>`);
    doc.close();
    const cleanup = () => window.setTimeout(() => frame.remove(), 500);
    win.addEventListener("afterprint", cleanup, { once: true });
    win.focus();
    win.print();
    window.setTimeout(() => frame.isConnected && frame.remove(), 60_000);
  };

  const wipe = () => {
    setNotes(EMPTY);
    setSheet(null);
  };

  const area =
    "mt-2 w-full resize-y rounded-[14px] border border-el-ink/15 bg-el-bg-2 px-4 py-3 text-[16px] leading-relaxed text-el-ink placeholder:text-el-mute/70 focus:border-el-acc focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-el-acc";

  return (
    <EloSection id={SECTION.precheck} labelledBy="elo-pre-title" className="bg-el-bg-2">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-16">
        <div>
          <EloHeading
            id="elo-pre-title"
            eyebrow="Pré-consulta"
            title={
              <>
                Chegue com tudo <em>anotado.</em>
              </>
            }
            lead="Escreva o motivo da consulta, as alergias e os remédios que você usa. Vira um resumo para imprimir ou mostrar no celular."
          />
          <div className="mt-8 flex gap-4 rounded-[20px] border border-el-acc/25 bg-el-acc/[0.05] p-5">
            <svg aria-hidden width="26" height="26" viewBox="0 0 26 26" fill="none" className="mt-0.5 shrink-0 text-el-acc">
              <rect x="5" y="11" width="16" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
              <path d="M9 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            <div>
              <p className="font-elo text-[17px] font-medium text-el-ink">Fica só no seu aparelho</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-el-mute">
                Nada do que você escreve aqui é enviado nem guardado. Ao recarregar ou fechar a página, some.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[26px] border border-el-line bg-el-bg p-5 sm:p-8">
          {sheet ? (
            <div>
              <div
                ref={sheetRef}
                tabIndex={-1}
                aria-label="Resumo da pré-consulta"
                className="rounded-[18px] border border-el-line bg-el-bg-2 p-5 shadow-[0_24px_60px_-40px_rgb(20_32_31/0.6)] outline-none sm:p-7"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-el-line pb-4">
                  <p className="font-elo text-[19px] font-medium text-el-ink">Pré-consulta · {ELO.name}</p>
                  <p className="text-[13px] text-el-mute">feito em {sheet.made}</p>
                </div>
                <dl className="mt-1">
                  {rows(sheet).map(([k, v]) => (
                    <div key={k} className="grid gap-1 border-b border-el-line py-3.5 last:border-0 sm:grid-cols-[180px_1fr] sm:gap-4">
                      <dt className="text-[14px] text-el-mute">{k}</dt>
                      <dd className="text-[15.5px] leading-relaxed whitespace-pre-wrap text-el-ink">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={print} className={BTN}>
                  Imprimir resumo
                </button>
                <button type="button" onClick={() => setSheet(null)} className={BTN_GHOST}>
                  Editar
                </button>
                <button type="button" onClick={wipe} className={`${LINK} px-2 text-[15px]`}>
                  Apagar tudo
                </button>
              </div>
              {!sheet.booked && (
                <p className="mt-4 text-[14.5px] text-el-mute">
                  Ainda sem consulta?{" "}
                  <a
                    href={`#${SECTION.booking}`}
                    onClick={(event) => {
                      event.preventDefault();
                      scrollToSection(SECTION.booking);
                    }}
                    className={LINK}
                  >
                    Agende aqui
                  </a>{" "}
                  e gere o resumo de novo.
                </p>
              )}
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                make();
              }}
              autoComplete="off"
              className="grid gap-5"
            >
              <div>
                <label htmlFor="elo-pre-name" className="font-elo text-[15px] text-el-ink">
                  Nome do paciente <span className="ml-1 text-[13.5px] text-el-mute">opcional</span>
                </label>
                <input id="elo-pre-name" value={notes.name} onChange={(e) => set("name", e.target.value)} maxLength={120} className={`${area} resize-none`} />
              </div>
              <div>
                <label htmlFor="elo-pre-reason" className="font-elo text-[15px] text-el-ink">
                  Motivo da consulta
                </label>
                <textarea
                  id="elo-pre-reason"
                  rows={3}
                  maxLength={1200}
                  value={notes.reason}
                  onChange={(e) => set("reason", e.target.value)}
                  placeholder="O que você quer conversar, desde quando, o que já tentou…"
                  className={area}
                />
              </div>
              <div>
                <label htmlFor="elo-pre-allergies" className="font-elo text-[15px] text-el-ink">
                  Alergias
                </label>
                <textarea
                  id="elo-pre-allergies"
                  rows={2}
                  maxLength={600}
                  value={notes.noAllergies ? "" : notes.allergies}
                  disabled={notes.noAllergies}
                  onChange={(e) => set("allergies", e.target.value)}
                  placeholder="A remédios, alimentos, látex…"
                  className={`${area} disabled:opacity-50`}
                />
                <label className="mt-2.5 flex cursor-pointer items-center gap-3 text-[15px] text-el-ink">
                  <input
                    type="checkbox"
                    checked={notes.noAllergies}
                    onChange={(e) => set("noAllergies", e.target.checked)}
                    className="h-5 w-5 accent-[#0f5c57]"
                  />
                  Não tenho alergias conhecidas
                </label>
              </div>
              <div>
                <label htmlFor="elo-pre-meds" className="font-elo text-[15px] text-el-ink">
                  Remédios em uso
                </label>
                <textarea
                  id="elo-pre-meds"
                  rows={2}
                  maxLength={800}
                  value={notes.meds}
                  onChange={(e) => set("meds", e.target.value)}
                  placeholder="Nome e como você toma, do jeito que está na receita ou na caixa"
                  className={area}
                />
              </div>
              <div>
                <label htmlFor="elo-pre-questions" className="font-elo text-[15px] text-el-ink">
                  Perguntas para o profissional <span className="ml-1 text-[13.5px] text-el-mute">opcional</span>
                </label>
                <textarea
                  id="elo-pre-questions"
                  rows={2}
                  maxLength={800}
                  value={notes.questions}
                  onChange={(e) => set("questions", e.target.value)}
                  className={area}
                />
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <button type="submit" disabled={empty} className={BTN}>
                  Gerar resumo
                </button>
                <p className="text-[13.5px] text-el-mute">Nada é enviado: o resumo é montado aqui mesmo.</p>
              </div>
            </form>
          )}
        </div>
      </div>
    </EloSection>
  );
}
