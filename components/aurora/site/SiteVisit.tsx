"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { RATE_LIMITED_MESSAGE, elapsedSince, validateLead, type LeadErrors } from "@/components/home/parts-b/leadRules";
import { AURORA, AURORA_ROOMS, AURORA_TYPES, AURORA_UNITS } from "@/content/aurora";
import { cn } from "@/lib/cn";
import { onSite, SECTION } from "./bus";
import { SiteHeading, SiteSection } from "./SiteSection";

type Status = "idle" | "sending" | "sent" | "error" | "limited";

const OPTIONS = AURORA_UNITS.filter((u) => u.status !== "vendida")
  .sort((a, b) => b.floor - a.floor)
  .map((u) => ({ value: u.id, label: `${u.id} · ${AURORA_TYPES[u.type].name} · ${u.floor}º andar${u.status === "reservada" ? " (reservada)" : ""}` }));

const PHOTO = AURORA_ROOMS[0].image;

/**
 * "Agendar visita": name, WhatsApp or e-mail, unit of interest and message, POSTed as JSON to
 * /api/lead with source "demo-imobiliaria". `company` is a hidden honeypot. Errors keep the
 * typed data and offer a retry.
 */
export function SiteVisit() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [interest, setInterest] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");
  const [errors, setErrors] = useState<LeadErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const formRef = useRef<HTMLFormElement>(null);
  // performance.now() when the form was first seen or touched (0 = not yet) → elapsedMs
  const startedAt = useRef(0);
  const markStart = () => {
    if (!startedAt.current) startedAt.current = performance.now();
  };
  const showForm = status !== "sent";

  useEffect(() => {
    const el = formRef.current;
    if (!showForm || !el || startedAt.current) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        if (!startedAt.current) startedAt.current = performance.now();
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [showForm]);

  // prefilled by the explorer (unit) and by Lia (visit time)
  useEffect(() => {
    const offUnit = onSite("unit", (u) => {
      if (u.status !== "vendida") setInterest(u.id);
    });
    const offVisit = onSite("visit", (v) => {
      if (v.interest) setInterest(v.interest);
      if (v.message) setMessage(v.message);
      setStatus((s) => (s === "sent" ? "idle" : s));
    });
    return () => {
      offUnit();
      offVisit();
    };
  }, []);

  const submit = async () => {
    const found = validateLead({ name, contact, message });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: "demo-imobiliaria",
          name: name.trim(),
          contact: contact.trim(),
          interest: interest || undefined,
          message: message.trim(),
          company,
          elapsedMs: elapsedSince(startedAt.current),
        }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; fields?: string[] } | null;
      if (res.ok && body?.ok) {
        setStatus("sent");
        return;
      }
      if (res.status === 429) {
        setStatus("limited");
        return;
      }
      if (res.status === 422 && body?.fields?.includes("contact")) {
        setErrors({ contact: "Informe um e-mail válido ou um WhatsApp com DDD." });
        setStatus("idle");
        return;
      }
      setStatus("error");
    } catch {
      setStatus("error");
    }
  };

  const field =
    "w-full border-0 border-b border-au-line bg-transparent px-0 py-3 text-[15px] text-au-ink placeholder:text-au-mute/70 transition-colors focus:border-au-gold focus:outline-none aria-[invalid=true]:border-[#e58a7a]";

  return (
    <SiteSection id={SECTION.visit} className="bg-au-bg-2/60">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-20">
        <div>
          <SiteHeading
            eyebrow="Agendar visita"
            title="Venha ver o pôr do sol do decorado."
            lead={`Conte quando prefere e qual residência quer conhecer. A equipe da ${AURORA.developer} confirma pelo canal que você escolher.`}
          />
          <div className="relative mt-10 aspect-[16/10] overflow-hidden border border-au-line max-lg:hidden">
            <Image src={PHOTO.src} alt={PHOTO.alt} fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
          </div>
        </div>

        <div className="lg:pt-6">
          {status === "sent" ? (
            <div role="status" className="border border-au-gold/50 p-8 transition-opacity duration-700 starting:opacity-0">
              <span className="grid h-12 w-12 place-items-center rounded-full border border-au-gold text-[18px] text-au-gold">✓</span>
              <p className="mt-6 font-aurora text-[30px] leading-tight font-light">Pedido de visita enviado.</p>
              <p className="mt-4 text-[14.5px] leading-relaxed text-au-mute">
                Obrigado, {name.trim().split(" ")[0]}. Este é um site-demo e a {AURORA.developer} é fictícia: num site real, este
                pedido chegaria na hora ao WhatsApp e ao CRM da equipe de vendas.
              </p>
              <button
                type="button"
                onClick={() => {
                  startedAt.current = performance.now();
                  setStatus("idle");
                  setMessage("");
                }}
                className="mt-7 border border-au-line px-5 py-3.5 text-[10px] leading-none font-bold tracking-[0.22em] uppercase transition-colors hover:border-au-gold hover:text-au-gold"
              >
                Enviar outro pedido
              </button>
            </div>
          ) : (
            <form
              ref={formRef}
              noValidate
              onFocusCapture={markStart}
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
              className="grid gap-7"
            >
              <Field label="Nome" error={errors.name} htmlFor="au-name">
                <input
                  id="au-name"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "au-name-err" : undefined}
                  placeholder="Como podemos te chamar"
                  className={field}
                />
              </Field>
              <Field label="WhatsApp ou e-mail" error={errors.contact} htmlFor="au-contact">
                <input
                  id="au-contact"
                  name="contact"
                  autoComplete="email"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  aria-invalid={Boolean(errors.contact)}
                  aria-describedby={errors.contact ? "au-contact-err" : undefined}
                  placeholder="(48) 99999-0000 ou voce@email.com"
                  className={field}
                />
              </Field>
              <Field label="Unidade de interesse" htmlFor="au-interest">
                <select
                  id="au-interest"
                  name="interest"
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  className={cn(field, "cursor-pointer [&>option]:bg-au-bg")}
                >
                  <option value="">Ainda não sei</option>
                  {OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Mensagem" error={errors.message} htmlFor="au-message" optional>
                <textarea
                  id="au-message"
                  name="message"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  aria-invalid={Boolean(errors.message)}
                  placeholder="Dia e horário de preferência, dúvidas…"
                  className={cn(field, "resize-none")}
                />
              </Field>

              {/* honeypot: hidden from people, filled by bots */}
              <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label htmlFor="au-company">Empresa</label>
                <input
                  id="au-company"
                  name="company"
                  tabIndex={-1}
                  autoComplete="off"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>

              {status === "error" && (
                <p role="alert" className="border border-[#e58a7a]/50 px-4 py-3 text-[13.5px] leading-snug text-[#f0b2a6]">
                  Não conseguimos enviar agora. Seus dados continuam aqui — verifique a conexão e toque em “Tentar novamente”.
                </p>
              )}
              {status === "limited" && (
                <p role="alert" className="border border-[#e58a7a]/50 px-4 py-3 text-[13.5px] leading-snug text-[#f0b2a6]">
                  {RATE_LIMITED_MESSAGE}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-5">
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="group flex items-center gap-4 bg-au-ink px-7 py-4.5 text-[10.5px] leading-none font-bold tracking-[0.24em] text-au-bg uppercase transition-colors hover:bg-au-gold disabled:opacity-60"
                >
                  {status === "sending" ? "Enviando…" : status === "error" || status === "limited" ? "Tentar novamente" : "Agendar visita"}
                  <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </button>
                <p className="max-w-[260px] text-[11.5px] leading-snug text-au-mute">
                  Usamos seu contato só para responder a este pedido.
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
      <label htmlFor={htmlFor} className="text-[10px] font-semibold tracking-[0.22em] text-au-gold uppercase">
        {label}
        {optional && <span className="ml-2 tracking-[0.14em] text-au-mute normal-case">opcional</span>}
      </label>
      {children}
      {error && (
        <p id={`${htmlFor}-err`} className="mt-2 text-[12.5px] text-[#f0b2a6]">
          {error}
        </p>
      )}
    </div>
  );
}
