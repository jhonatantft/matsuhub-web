"use client";

import { useEffect, useRef, useState } from "react";
import { isPhone, LIMITS } from "@/components/home/parts-b/leadRules";
import { MARE, MARE_TABLES, MARE_ZONES } from "@/content/mare";
import { cn } from "@/lib/cn";
import {
  onSite,
  onTour,
  scrollToSection,
  SECTION,
  showTable,
  showZone,
  SLOTS,
  tableById,
  toSlot,
  type ReservePrefill,
  type Slot,
} from "./bus";
import { SiteHeading, SiteSection } from "./SiteSection";

type Status = "idle" | "sending" | "sent" | "error";
type Errors = Partial<Record<"date" | "slot" | "party" | "table" | "name" | "contact" | "message", string>>;

const GROUPS = MARE_ZONES.filter((z) => z.bookable).map((z) => ({
  zone: z,
  tables: MARE_TABLES.filter((t) => t.zone === z.id),
}));
const MAX_PARTY = Math.max(...MARE_TABLES.map((t) => t.seats));

/** yyyy-mm-dd of the visitor's local today (handlers/effects only). */
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const brDate = (iso: string) => iso.split("-").reverse().join("/");

/**
 * "Reservas": a real form. Prefilled by the tour (mare:reserve), by Nina and by the "A brasa"
 * section; every prefill scrolls here and flashes the form. POSTs JSON to /api/lead with
 * source "demo-restaurante"; `company` is a hidden honeypot.
 */
export function SiteReserve() {
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState<Slot | "">("");
  const [party, setParty] = useState(2);
  const [table, setTable] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");

  const dateRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // the date picker starts at today (set on the DOM: no clock reads during render)
  useEffect(() => {
    if (dateRef.current) dateRef.current.min = todayIso();
  });

  useEffect(() => {
    const apply = (p: ReservePrefill, scroll: boolean) => {
      if (p.tableId && tableById(p.tableId)) setTable(p.tableId);
      const s = toSlot(p.slot);
      if (s) setSlot(s);
      if (p.party && p.party > 0) setParty(Math.min(MAX_PARTY, Math.round(p.party)));
      if (p.message) setMessage((m) => (m.includes(p.message!) ? m : m ? `${m}\n${p.message}` : p.message!));
      setErrors({});
      setStatus((st) => (st === "sent" ? "idle" : st));
      formRef.current?.animate(
        [
          { boxShadow: "0 0 0 1px rgb(240 138 75 / 0.95), 0 0 70px -8px rgb(240 138 75 / 0.6)" },
          { boxShadow: "0 0 0 1px rgb(240 138 75 / 0), 0 0 0 0 rgb(240 138 75 / 0)" },
        ],
        { duration: 1800, delay: scroll ? 900 : 500, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "backwards" },
      );
      if (scroll) scrollToSection(SECTION.reserve);
    };
    const offSite = onSite("reserve", (p) => apply(p, false));
    const offTour = onTour("mare:reserve", (d) => apply({ tableId: d.tableId, slot: d.slot, party: d.party }, true));
    return () => {
      offSite();
      offTour();
    };
  }, []);

  const chosen = tableById(table);

  const validate = (): Errors => {
    const e: Errors = {};
    if (!date) e.date = "Escolha o dia da reserva.";
    else if (date < todayIso()) e.date = "Escolha hoje ou uma data futura.";
    if (!slot) e.slot = "Escolha um horário.";
    if (chosen && party > chosen.seats)
      e.table = `${chosen.label} acomoda até ${chosen.seats} pessoas. Escolha outra mesa ou deixe sem preferência.`;
    if (name.trim().length < LIMITS.nameMin) e.name = "Diga em nome de quem fica a reserva.";
    if (!contact.trim()) e.contact = "Deixe um WhatsApp para confirmarmos.";
    else if (!isPhone(contact)) e.contact = "Informe um WhatsApp com DDD, só números.";
    if (message.length > 600) e.message = "Use até 600 caracteres.";
    return e;
  };

  const submit = async () => {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = Object.keys(found)[0];
      document.getElementById(`ma-${first}`)?.focus();
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: "demo-restaurante",
          name: name.trim(),
          contact: contact.trim(),
          interest: `${chosen?.label ?? "Sem preferência de mesa"} · ${brDate(date)} · ${slot} · ${party} ${party === 1 ? "pessoa" : "pessoas"}`,
          message: message.trim(),
          company,
        }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; fields?: string[] } | null;
      if (res.ok && body?.ok) {
        setStatus("sent");
        return;
      }
      if (res.status === 422 && body?.fields?.includes("contact")) {
        setErrors({ contact: "Informe um WhatsApp com DDD, só números." });
        setStatus("idle");
        return;
      }
      setStatus("error");
    } catch {
      setStatus("error");
    }
  };

  const pickOnMap = () => {
    if (chosen) showTable(chosen.id);
    else showZone("salao");
    scrollToSection(SECTION.salon);
  };

  const field =
    "w-full rounded-none border-0 border-b border-ma-line bg-transparent px-0 py-3 text-[15px] text-ma-ink placeholder:text-ma-mute/60 transition-colors focus:border-ma-ember focus:outline-none aria-[invalid=true]:border-[#e58a7a] [color-scheme:dark]";
  const described = (k: keyof Errors) => ({
    "aria-invalid": Boolean(errors[k]),
    "aria-describedby": errors[k] ? `ma-${k}-err` : undefined,
  });

  return (
    <SiteSection id={SECTION.reserve} className="bg-ma-bg-2/70">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div>
          <SiteHeading
            eyebrow="Reservas"
            title={
              <>
                Sua mesa, <em>do jeito que você viu.</em>
              </>
            }
            lead="Escolha a mesa aqui ou direto no salão, lá em cima. A equipe confirma pelo WhatsApp."
          />
          <dl className="mt-10 grid max-w-[420px] gap-3 border-t border-ma-line pt-6 text-[14px]">
            {MARE.hours.map((h) => (
              <div key={h.days} className="flex justify-between gap-6">
                <dt className="text-ma-mute">{h.days}</dt>
                <dd className="text-right lining-nums tabular-nums">{h.time}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 max-w-[420px] text-[13px] leading-relaxed text-ma-mute">
            O bar e a adega não recebem reservas: é chegar e sentar. Para grupos acima de {MAX_PARTY} pessoas, conte nas observações.
          </p>
        </div>

        <div ref={formRef} className="relative rounded-[22px] border border-ma-line bg-ma-bg/70 p-[clamp(22px,3.4vw,44px)]">
          {status === "sent" ? (
            <div role="status" className="py-6 transition-opacity duration-700 starting:opacity-0">
              <span className="grid h-12 w-12 place-items-center rounded-full border border-ma-ember text-[18px] text-ma-ember">✓</span>
              <p className="mt-6 font-mare text-[34px] leading-tight font-light">Pedido de reserva enviado.</p>
              <p className="mt-3 text-[15px] text-ma-ink/85">
                {chosen?.label ?? "Mesa a definir"} · {brDate(date)} · {slot} · {party} {party === 1 ? "pessoa" : "pessoas"}
              </p>
              <p className="mt-4 text-[14px] leading-relaxed text-ma-mute">
                Obrigado, {name.trim().split(" ")[0]}. Este é um site-demo e o {MARE.name} é fictício: num site real, o pedido
                chegaria na hora ao WhatsApp da casa e à agenda de reservas.
              </p>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="mt-7 rounded-full border border-ma-line px-5 py-3.5 text-[10px] leading-none font-bold tracking-[0.22em] uppercase transition-colors hover:border-ma-ember hover:text-ma-ember"
              >
                Fazer outra reserva
              </button>
            </div>
          ) : (
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
              className="grid gap-7"
            >
              <div className="grid gap-7 sm:grid-cols-[1.1fr_1fr]">
                <Field label="Data" htmlFor="ma-date" error={errors.date}>
                  <input
                    ref={dateRef}
                    id="ma-date"
                    type="date"
                    name="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    {...described("date")}
                    className={cn(field, "min-h-[50px]")}
                  />
                </Field>
                <Field label="Pessoas" htmlFor="ma-party" error={errors.party}>
                  <select
                    id="ma-party"
                    name="party"
                    value={party}
                    onChange={(e) => setParty(Number(e.target.value))}
                    className={cn(field, "cursor-pointer [&>option]:bg-ma-bg")}
                  >
                    {Array.from({ length: MAX_PARTY }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "pessoa" : "pessoas"}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <fieldset aria-describedby={errors.slot ? "ma-slot-err" : undefined}>
                <legend className="text-[10px] font-semibold tracking-[0.22em] text-ma-ember uppercase">Horário</legend>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {SLOTS.map((s, i) => (
                    <label key={s} className="relative cursor-pointer">
                      <input
                        id={i === 0 ? "ma-slot" : undefined}
                        type="radio"
                        name="slot"
                        value={s}
                        checked={slot === s}
                        onChange={() => setSlot(s)}
                        className="peer sr-only"
                      />
                      <span className="block rounded-full border border-ma-line py-3 text-center font-mare text-[20px] leading-none transition-colors peer-checked:border-ma-ember peer-checked:bg-ma-ember peer-checked:text-ma-bg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ma-ember hover:border-ma-ember/60">
                        {s}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.slot && (
                  <p id="ma-slot-err" className="mt-2 text-[12.5px] text-[#f3b4a6]">
                    {errors.slot}
                  </p>
                )}
              </fieldset>

              <Field label="Área / mesa" htmlFor="ma-table" error={errors.table}>
                <div className="flex items-end gap-3">
                  <select
                    id="ma-table"
                    name="table"
                    value={table}
                    onChange={(e) => setTable(e.target.value)}
                    {...described("table")}
                    className={cn(field, "min-w-0 flex-1 cursor-pointer [&_option]:bg-ma-bg")}
                  >
                    <option value="">Sem preferência</option>
                    {GROUPS.map((g) => (
                      <optgroup key={g.zone.id} label={g.zone.name}>
                        {g.tables.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label} · até {t.seats} {t.note ? `· ${t.note}` : ""}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={pickOnMap}
                    className="mb-1 shrink-0 rounded-full border border-ma-line px-4 py-2.5 text-[12px] leading-none whitespace-nowrap text-ma-ink transition-colors hover:border-ma-ember hover:text-ma-ember"
                  >
                    Escolher no mapa ↑
                  </button>
                </div>
                {chosen && !errors.table && (
                  <p className="mt-2 text-[12.5px] text-ma-mute">
                    {MARE_ZONES.find((z) => z.id === chosen.zone)?.note}.
                  </p>
                )}
              </Field>

              <div className="grid gap-7 sm:grid-cols-2">
                <Field label="Nome" htmlFor="ma-name" error={errors.name}>
                  <input
                    id="ma-name"
                    name="name"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    {...described("name")}
                    placeholder="Em nome de quem"
                    className={field}
                  />
                </Field>
                <Field label="WhatsApp" htmlFor="ma-contact" error={errors.contact}>
                  <input
                    id="ma-contact"
                    name="contact"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    {...described("contact")}
                    placeholder="(48) 99999-0000"
                    className={field}
                  />
                </Field>
              </div>

              <Field label="Observações" htmlFor="ma-message" error={errors.message} optional>
                <textarea
                  id="ma-message"
                  name="message"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  {...described("message")}
                  placeholder="Restrições alimentares, aniversário, cadeirinha…"
                  className={cn(field, "resize-none")}
                />
              </Field>

              {/* honeypot: hidden from people, filled by bots */}
              <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label htmlFor="ma-company">Empresa</label>
                <input
                  id="ma-company"
                  name="company"
                  tabIndex={-1}
                  autoComplete="off"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>

              {status === "error" && (
                <p role="alert" className="rounded-[12px] border border-[#e58a7a]/50 px-4 py-3 text-[13.5px] leading-snug text-[#f3b4a6]">
                  Não conseguimos enviar agora. Seus dados continuam aqui: verifique a conexão e toque em “Tentar novamente”.
                </p>
              )}

              <div className="flex flex-wrap items-center gap-5">
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="group flex items-center gap-4 rounded-full bg-ma-ember px-7 py-4.5 text-[10.5px] leading-none font-bold tracking-[0.24em] text-ma-bg uppercase transition-[background-color,opacity] hover:bg-ma-ink disabled:opacity-60"
                >
                  {status === "sending" ? "Enviando…" : status === "error" ? "Tentar novamente" : "Pedir reserva"}
                  <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </button>
                <p className="max-w-[260px] text-[11.5px] leading-snug text-ma-mute">
                  Usamos seu WhatsApp só para confirmar esta reserva.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </SiteSection>
  );
}

function Field({
  label,
  htmlFor,
  error,
  optional,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-[10px] font-semibold tracking-[0.22em] text-ma-ember uppercase">
        {label}
        {optional && <span className="ml-2 tracking-[0.14em] text-ma-mute normal-case">opcional</span>}
      </label>
      {children}
      {error && (
        <p id={`${htmlFor}-err`} className="mt-2 text-[12.5px] text-[#f3b4a6]">
          {error}
        </p>
      )}
    </div>
  );
}
