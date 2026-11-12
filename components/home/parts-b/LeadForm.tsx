"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { dict, fill, type Lang } from "@/lib/i18n";
import {
  INTERESTS,
  LEAD_MESSAGES,
  LIMITS,
  elapsedSince,
  isEmail,
  leadMessage,
  validateLead,
  type LeadErrors,
  type LeadFields,
} from "./leadRules";

type Status = "idle" | "sending" | "success" | "error" | "limited";

const EMPTY: LeadFields = { name: "", contact: "", message: "" };

const fieldCls = (invalid: boolean) =>
  cn(
    "w-full rounded-[14px] border bg-black/35 px-4 text-[15px] text-ink placeholder:text-dim",
    "transition-[border-color,box-shadow,background-color] duration-300 ease-soft",
    "hover:border-line-2 focus:bg-black/50 focus:outline-none focus-visible:outline-none",
    invalid
      ? "border-danger/70 focus:border-danger focus:shadow-[0_0_0_4px_rgb(255_122_107/0.14)]"
      : "border-line focus:border-acc/80 focus:shadow-[0_0_0_4px_rgb(185_255_75/0.12)]",
  );

function FieldError({ id, msg }: { id: string; msg?: string }) {
  return (
    <p id={id} className={cn("mt-2 flex items-center gap-1.5 text-[13px] text-danger", !msg && "hidden")}>
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <circle cx="8" cy="8" r="6.5" />
        <path d="M8 4.8v3.6M8 11v.2" strokeLinecap="round" />
      </svg>
      {msg}
    </p>
  );
}

const labelCls = "mb-2 block font-mono text-[11px] font-medium tracking-[0.14em] text-mute uppercase";

/**
 * The 422 body of /api/lead names the fields it rejected; show them with the form's own messages
 * (the API's text is Portuguese-only, so it is never displayed).
 */
async function serverFieldErrors(res: Response, lang: Lang): Promise<LeadErrors | null> {
  const body = (await res.json().catch(() => null)) as { error?: string; fields?: unknown } | null;
  if (body?.error !== "invalid" || !Array.isArray(body.fields)) return null;
  const e: LeadErrors = {};
  for (const field of body.fields) {
    if (field === "name") e.name = leadMessage("nameMin", lang);
    else if (field === "contact") e.contact = leadMessage("contactInvalid", lang);
    else if (field === "message") e.message = leadMessage("messageMax", lang);
  }
  return Object.keys(e).length ? e : null;
}

/**
 * The contact form: client validation in the page's language, POST JSON to /api/lead (the same
 * payload in both languages: interest values are the API's, only their labels are translated),
 * success replaces the form. API errors are shown from their codes, never from the server's text.
 */
export function LeadForm({ lang = "pt" }: { lang?: Lang }) {
  const d = dict(lang).lead;
  const messages = LEAD_MESSAGES[lang];
  const uid = useId();
  const id = (k: string) => `${uid}-${k}`;
  const [f, setF] = useState<LeadFields>(EMPTY);
  const [interests, setInterests] = useState<string[]>([]);
  const [company, setCompany] = useState("");
  const [errors, setErrors] = useState<LeadErrors>({});
  const [tried, setTried] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [sentName, setSentName] = useState("");
  const [sentVia, setSentVia] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  // performance.now() when the form first became visible or was first touched (0 = not yet);
  // sent as elapsedMs so /api/lead can tell people from scripts
  const startedAt = useRef(0);
  const markStart = () => {
    if (!startedAt.current) startedAt.current = performance.now();
  };
  const showForm = status !== "success";

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

  const set = (k: keyof LeadFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const next = { ...f, [k]: e.target.value };
    setF(next);
    // after the first submit, re-validate live so messages clear as the user fixes them
    if (tried) setErrors(validateLead(next, lang));
    if (status === "error" || status === "limited") setStatus("idle");
  };

  const toggle = (v: string) =>
    setInterests((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    setTried(true);
    const errs = validateLead(f, lang);
    setErrors(errs);
    const first = (["name", "contact", "message"] as const).find((k) => errs[k]);
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: "site",
          name: f.name.trim(),
          contact: f.contact.trim(),
          interests,
          message: f.message.trim(),
          company,
          elapsedMs: elapsedSince(startedAt.current),
        }),
      });
      if (res.status === 429) {
        setStatus("limited");
        return;
      }
      if (res.status === 422) {
        const fieldErrors = await serverFieldErrors(res, lang);
        if (fieldErrors) {
          setErrors(fieldErrors);
          setStatus("idle");
          return;
        }
      }
      if (!res.ok) throw new Error(String(res.status));
      setSentName(f.name.trim().split(/\s+/)[0] ?? "");
      setSentVia(isEmail(f.contact) ? d.viaEmail : d.viaWhatsapp);
      setStatus("success");
      setF(EMPTY);
      setInterests([]);
      setTried(false);
      requestAnimationFrame(() => doneRef.current?.focus());
    } catch {
      setStatus("error");
    }
  }

  const reset = () => {
    startedAt.current = performance.now();
    setStatus("idle");
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[name="name"]')?.focus());
  };

  if (status === "success") {
    return (
      <div className="flex min-h-[520px] flex-col items-center justify-center px-2 py-10 text-center" role="status">
        <style href="mhb-lead" precedence="default">{`
          @keyframes mhb-draw { from { stroke-dashoffset: 40 } to { stroke-dashoffset: 0 } }
          @keyframes mhb-ring { from { transform: scale(.6); opacity: 0 } to { transform: none; opacity: 1 } }
          .mhb-draw { stroke-dasharray: 40; animation: mhb-draw .7s .25s cubic-bezier(.2,.8,.2,1) both }
          .mhb-ring { animation: mhb-ring .7s cubic-bezier(.2,.8,.2,1) both }
        `}</style>
        <div className="mhb-ring relative grid h-24 w-24 place-items-center rounded-full border border-acc/40 bg-acc/10 shadow-[0_0_80px_-10px_rgb(185_255_75/0.6)]">
          <span aria-hidden className="absolute -inset-3 rounded-full border border-dashed border-acc/25 animate-spin-slow" />
          <svg viewBox="0 0 24 24" className="h-10 w-10 text-acc" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path className="mhb-draw" d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </div>
        <h3 ref={doneRef} tabIndex={-1} className="h-card mt-8 outline-none">
          {d.received}
          {sentName ? `, ${sentName}` : ""}!
        </h3>
        <p className="mt-3 max-w-[38ch] text-mute">{fill(d.thanks, { via: sentVia })}</p>
        <Button variant="ghost" size="sm" arrow={false} className="mt-8" onClick={reset}>
          {d.again}
        </Button>
      </div>
    );
  }

  const sending = status === "sending";

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} onFocusCapture={markStart} aria-busy={sending} className="grid gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor={id("name")} className={labelCls}>
            {d.name}
          </label>
          <input
            id={id("name")}
            name="name"
            type="text"
            autoComplete="name"
            placeholder={d.namePlaceholder}
            value={f.name}
            onChange={set("name")}
            maxLength={LIMITS.nameMax + 20}
            aria-invalid={!!errors.name}
            aria-describedby={id("name-err")}
            className={cn(fieldCls(!!errors.name), "h-[54px]")}
          />
          <FieldError id={id("name-err")} msg={errors.name} />
        </div>
        <div>
          <label htmlFor={id("contact")} className={labelCls}>
            {d.contact}
          </label>
          <input
            id={id("contact")}
            name="contact"
            type="text"
            inputMode="email"
            autoComplete="email"
            placeholder={d.contactPlaceholder}
            value={f.contact}
            onChange={set("contact")}
            maxLength={LIMITS.contactMax + 20}
            aria-invalid={!!errors.contact}
            aria-describedby={id("contact-err")}
            className={cn(fieldCls(!!errors.contact), "h-[54px]")}
          />
          <FieldError id={id("contact-err")} msg={errors.contact} />
        </div>
      </div>

      <fieldset>
        <legend className={labelCls}>
          {d.interests} <span className="tracking-normal text-dim normal-case">{d.interestsHint}</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((v) => {
            const on = interests.includes(v);
            return (
              <label
                key={v}
                className={cn(
                  "relative inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2.5 text-[14px] font-semibold select-none",
                  "transition-[border-color,background-color,color,box-shadow] duration-300 ease-soft",
                  "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-acc",
                  on
                    ? "border-acc bg-acc/12 text-acc shadow-[0_0_24px_-6px_rgb(185_255_75/0.55)]"
                    : "border-line text-mute hover:border-line-2 hover:text-ink",
                )}
              >
                <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(v)} name="interests" />
                <span
                  aria-hidden
                  className={cn(
                    "grid h-4 w-4 place-items-center rounded-full border transition-colors duration-300",
                    on ? "border-acc bg-acc text-[#061006]" : "border-line-2",
                  )}
                >
                  <svg viewBox="0 0 16 16" className={cn("h-2.5 w-2.5 transition-opacity", on ? "opacity-100" : "opacity-0")} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m3.5 8.5 3 3 6-7" />
                  </svg>
                </span>
                {d.interestLabels[v]}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor={id("message")} className={labelCls}>
            {d.message}
          </label>
          <span className={cn("font-mono text-[11px] tabular-nums", f.message.length > LIMITS.messageMax ? "text-danger" : "text-dim")}>
            {f.message.length}/{LIMITS.messageMax}
          </span>
        </div>
        <textarea
          id={id("message")}
          name="message"
          rows={5}
          placeholder={d.messagePlaceholder}
          value={f.message}
          onChange={set("message")}
          aria-invalid={!!errors.message}
          aria-describedby={id("message-err")}
          className={cn(fieldCls(!!errors.message), "min-h-[140px] resize-y py-3.5 leading-relaxed")}
        />
        <FieldError id={id("message-err")} msg={errors.message} />
      </div>

      {/* honeypot: hidden from people and assistive tech, bots fill it */}
      <div aria-hidden className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label htmlFor={id("company")}>{d.company}</label>
        <input
          id={id("company")}
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      <div role="alert" aria-live="assertive" className="empty:hidden">
        {status === "error" && (
          <p className="flex items-start gap-2.5 rounded-[14px] border border-danger/40 bg-danger/10 px-4 py-3 text-[14px] text-ink">
            <svg viewBox="0 0 16 16" className="mt-[3px] h-4 w-4 shrink-0 text-danger" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <circle cx="8" cy="8" r="6.5" />
              <path d="M8 4.8v3.6M8 11v.2" strokeLinecap="round" />
            </svg>
            {messages.failed}
          </p>
        )}
        {status === "limited" && (
          <p className="flex items-start gap-2.5 rounded-[14px] border border-danger/40 bg-danger/10 px-4 py-3 text-[14px] text-ink">
            <svg viewBox="0 0 16 16" className="mt-[3px] h-4 w-4 shrink-0 text-danger" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <circle cx="8" cy="8" r="6.5" />
              <path d="M8 4.8v3.6M8 11v.2" strokeLinecap="round" />
            </svg>
            {messages.rateLimited}
          </p>
        )}
      </div>

      <div className="flex flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12.5px] leading-snug text-mute sm:max-w-[30ch]">
          {d.privacy}
        </p>
        <Button type="submit" disabled={sending} arrow={sending ? false : "→"} className="h-[54px] px-7 sm:min-w-[210px]">
          {sending && (
            <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          {sending ? d.sending : d.send}
        </Button>
      </div>
    </form>
  );
}
