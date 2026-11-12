"use client";

import { useEffect, useRef, useState } from "react";
import { elapsedSince, isEmail, LIMITS, RATE_LIMITED_MESSAGE } from "@/components/home/parts-b/leadRules";
import {
  ELO,
  ELO_PRIVACY,
  ELO_SPECIALTIES,
  eloDaysLabel,
  eloModes,
  eloProfessional,
  eloProfessionalsFor,
  eloRoom,
  eloSpecialty,
  type EloMode,
  type EloSpecialtyId,
} from "@/content/clinica";
import {
  dayKey,
  findFreeSlot,
  friendlySlot,
  longDay,
  nextFreeForProfessional,
  nextFreeForSpecialty,
  timeLabel,
} from "@/lib/clinica/availability";
import { cn } from "@/lib/cn";
import { bookingIcs, interestLine, isBrWhatsApp, modeLabel, newUid, whatToBring } from "./booking";
import { BookingCalendar, freeCounts, TimeGrid } from "./BookingCalendar";
import { BookingDone, type Done } from "./BookingDone";
import { emitSite, onSite, onTour, revealEl, scrollToSection, SECTION, useNow, type BookPrefill } from "./bus";
import { BTN, BTN_GHOST, EloHeading, EloSection } from "./ui";

type Step = 1 | 2 | 3 | 4;
type Status = "idle" | "sending" | "error" | "limited";
type Pay = "particular" | "convenio" | "";
type First = "sim" | "nao" | "";
type Errors = Partial<Record<"name" | "phone" | "email" | "pay" | "first", string>>;

const TELE = ELO_SPECIALTIES.filter((s) => eloModes(s).includes("teleconsulta")).map((s) => s.name.toLowerCase());
const list = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`);

/**
 * "Agendar": the signature section. A real booking flow on the deterministic agenda of
 * lib/clinica/availability: specialty (+ teleconsulta where offered) → professional or "primeiro
 * horário disponível" → a four-week calendar and the day's time grid (taken times shown as taken)
 * → patient data → confirmation with a real .ics. Prefilled by the tour (elo:book), the specialty
 * cards, the exams section and Iris; every prefill scrolls here and flashes the card.
 * POSTs only name, WhatsApp and the appointment line to /api/lead — never health information.
 */
export function SiteBooking() {
  const now = useNow();

  const [specialty, setSpecialty] = useState<EloSpecialtyId | null>(null);
  const [mode, setMode] = useState<EloMode>("presencial");
  /** "first" = primeiro horário disponível. */
  const [pro, setPro] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  /** Start of the chosen slot (ms). */
  const [time, setTime] = useState<number | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [notice, setNotice] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pay, setPay] = useState<Pay>("");
  const [first, setFirst] = useState<First>("");
  const [company, setCompany] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [done, setDone] = useState<Done | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const shownAt = useRef(0);
  const icsRef = useRef<string | null>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);

  const spec = eloSpecialty(specialty ?? undefined);
  const modes = spec ? eloModes(spec) : [];
  const proId = pro && pro !== "first" ? pro : undefined;
  const slot = spec && time && now ? findFreeSlot(spec.id, proId, new Date(time), now) : undefined;

  // elapsedMs: from the moment the booking card is first on screen (measured in the observer)
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && shownAt.current === 0) {
        shownAt.current = performance.now();
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // the .ics Blob URL lives as long as the confirmation
  useEffect(
    () => () => {
      if (icsRef.current) URL.revokeObjectURL(icsRef.current);
    },
    [],
  );

  useEffect(() => {
    if (done) doneRef.current?.focus({ preventScroll: true });
  }, [done]);

  // prefill from the tour, the cards, the exams and Iris
  useEffect(() => {
    const apply = (p: BookPrefill) => {
      const s = eloSpecialty(p.specialty);
      if (!s) return;
      const ms = eloModes(s);
      const pid = p.professionalId && eloProfessional(p.professionalId)?.specialty === s.id ? p.professionalId : undefined;
      const at = p.start ? new Date(p.start) : null;
      const free = at && !Number.isNaN(at.getTime()) ? findFreeSlot(s.id, pid, at, new Date()) : undefined;

      setSpecialty(s.id);
      setMode(p.mode && ms.includes(p.mode) ? p.mode : ms[0]);
      setErrors({});
      setStatus("idle");
      setDone(null);
      if (free) {
        setPro(pid ?? free.professionalId);
        setDay(dayKey(free.start));
        setTime(free.start.getTime());
        setStep(4);
        setNotice("");
      } else {
        setPro(pid ?? (p.start ? "first" : null));
        setDay(null);
        setTime(null);
        setStep(pid || p.start ? 3 : 2);
        setNotice(p.start ? "Esse horário acabou de ser ocupado. Escolha outro abaixo." : "");
      }
      scrollToSection(SECTION.booking);
      cardRef.current?.animate(
        [
          { boxShadow: "0 0 0 2px rgb(15 92 87 / 0.9), 0 0 0 10px rgb(15 92 87 / 0.12), 0 30px 80px -30px rgb(15 92 87 / 0.5)" },
          { boxShadow: "0 0 0 2px rgb(15 92 87 / 0), 0 0 0 10px rgb(15 92 87 / 0), 0 30px 80px -30px rgb(15 92 87 / 0)" },
        ],
        { duration: 1800, delay: 900, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "backwards" },
      );
    };
    const offSite = onSite("book", apply);
    const offTour = onTour("elo:book", (d) => apply({ specialty: d.specialty, professionalId: d.professionalId, start: d.start }));
    return () => {
      offSite();
      offTour();
    };
  }, []);

  /* ---------------------------------------------------------------- choices */

  const chooseSpecialty = (id: EloSpecialtyId) => {
    if (id === specialty) return;
    const s = eloSpecialty(id)!;
    setSpecialty(id);
    setMode(eloModes(s)[0]);
    setPro(null);
    setDay(null);
    setTime(null);
    setNotice("");
  };

  const choosePro = (id: string) => {
    if (id === pro) return;
    setPro(id);
    setDay(null);
    setTime(null);
    setNotice("");
  };

  const chooseDay = (key: string) => {
    setDay(key);
    if (time && dayKey(new Date(time)) !== key) setTime(null);
    setNotice("");
  };

  const goto = (s: Step) => {
    setStep(s);
    setNotice("");
    window.setTimeout(() => {
      const heading = document.getElementById(`elo-step-${s}`);
      if (!heading) return;
      heading.focus({ preventScroll: true });
      revealEl(heading);
    }, 30);
  };

  /* ---------------------------------------------------------------- patient data */

  const validate = (): Errors => {
    const e: Errors = {};
    const n = name.trim();
    if (n.length < LIMITS.nameMin) e.name = "Informe o nome de quem vai ser atendido.";
    else if (n.length > LIMITS.nameMax) e.name = `Use até ${LIMITS.nameMax} caracteres.`;
    if (!phone.trim()) e.phone = "Informe um WhatsApp para a confirmação.";
    else if (!isBrWhatsApp(phone)) e.phone = "Informe o WhatsApp com DDD, por exemplo (48) 99999-0000.";
    if (email.trim() && !isEmail(email)) e.email = "Confira o e-mail, ou deixe em branco.";
    if (!pay) e.pay = "Escolha particular ou convênio.";
    if (!first) e.first = "Conte se é a primeira vez na Elo.";
    return e;
  };

  const check = (k: keyof Errors, filled: boolean) => {
    if (!filled) return;
    setErrors((prev) => ({ ...prev, [k]: validate()[k] }));
  };
  const clear = (k: keyof Errors) => setErrors((prev) => (prev[k] ? { ...prev, [k]: undefined } : prev));

  const dropIcs = () => {
    if (icsRef.current) URL.revokeObjectURL(icsRef.current);
    icsRef.current = null;
  };

  const submit = async () => {
    if (!spec || !time) return;
    const found = validate();
    setErrors(found);
    const keys = Object.keys(found) as (keyof Errors)[];
    if (keys.length > 0) {
      document.getElementById(`elo-${keys[0]}`)?.focus();
      return;
    }
    const free = findFreeSlot(spec.id, proId, new Date(time), new Date());
    if (!free) {
      setTime(null);
      goto(3);
      setNotice("Esse horário acabou de ser ocupado. Escolha outro abaixo.");
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: "demo-clinica",
          name: name.trim(),
          contact: phone.trim(),
          interest: interestLine(spec, free.professionalId, free.start, mode),
          message: "",
          company,
          elapsedMs: elapsedSince(shownAt.current),
        }),
      });
      if (res.status === 429) {
        setStatus("limited");
        return;
      }
      const body = (await res.json().catch(() => null)) as { ok?: boolean; fields?: string[] } | null;
      if (res.ok && body?.ok) {
        const bring = whatToBring(spec, mode, pay, first);
        const stamp = new Date();
        const ics = bookingIcs({
          spec,
          professionalId: free.professionalId,
          start: free.start,
          mode,
          bring,
          uid: newUid(stamp),
          stamp,
        });
        dropIcs();
        icsRef.current = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
        setDone({
          specialty: spec.id,
          professionalId: free.professionalId,
          start: free.start.getTime(),
          mode,
          bring,
          firstName: name.trim().split(/\s+/)[0],
          icsUrl: icsRef.current,
        });
        emitSite("booked", {
          specialty: spec.id,
          professionalId: free.professionalId,
          start: free.start.toISOString(),
          mode,
          label: `${spec.name} · ${eloProfessional(free.professionalId)?.name} · ${longDay(free.start)}, ${timeLabel(free.start)} · ${mode}`,
        });
        setStatus("idle");
        scrollToSection(SECTION.booking);
        return;
      }
      if (res.status === 422 && body?.fields?.includes("contact")) {
        setErrors({ phone: "Informe o WhatsApp com DDD, por exemplo (48) 99999-0000." });
        setStatus("idle");
        document.getElementById("elo-phone")?.focus();
        return;
      }
      if (res.status === 422 && body?.fields?.includes("name")) {
        setErrors({ name: "Confira o nome informado." });
        setStatus("idle");
        document.getElementById("elo-name")?.focus();
        return;
      }
      setStatus("error");
    } catch {
      setStatus("error");
    }
  };

  const again = () => {
    dropIcs();
    setDone(null);
    setSpecialty(null);
    setPro(null);
    setDay(null);
    setTime(null);
    setStep(1);
    setNotice("");
  };

  /* ---------------------------------------------------------------- view */

  const firstNext = spec && now ? nextFreeForSpecialty(spec.id, now, 1, 27)[0] : undefined;
  const counts = spec && now && step === 3 ? freeCounts(spec.id, proId, now) : new Map<string, number>();
  const chosenPro = eloProfessional(slot?.professionalId ?? proId);

  const summary1 = spec ? `${spec.name} · ${mode === "teleconsulta" ? "teleconsulta" : "presencial"}` : undefined;
  const summary2 = pro === "first" ? "Primeiro horário disponível" : (eloProfessional(proId)?.name ?? undefined);
  const summary3 = slot && now ? `${friendlySlot(slot, now)}${pro === "first" ? ` · ${chosenPro?.name}` : ""}` : undefined;

  const field =
    "mt-2 w-full rounded-[14px] border border-el-ink/15 bg-el-bg-2 px-4 py-3.5 text-[16px] text-el-ink placeholder:text-el-mute/70 transition-colors focus:border-el-acc focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-el-acc aria-[invalid=true]:border-[#b3261e]";
  const described = (k: keyof Errors) => ({
    "aria-invalid": Boolean(errors[k]),
    "aria-describedby": errors[k] ? `elo-${k}-err` : undefined,
  });

  return (
    <EloSection id={SECTION.booking} labelledBy="elo-book-title" className="bg-[#edf0ea]">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-16">
        <div className="lg:sticky lg:top-[calc(var(--demo-bar-h,0px)+96px)] lg:self-start">
          <EloHeading
            id="elo-book-title"
            eyebrow="Agendar"
            title={
              <>
                Escolha o horário <em>vendo a agenda.</em>
              </>
            }
            lead="Especialidade, profissional, dia e hora, com os horários livres e ocupados à vista. A confirmação chega pelo WhatsApp."
          />
          <ul className="mt-8 grid gap-3.5 text-[15.5px] leading-snug text-el-ink">
            <li className="flex gap-3">
              <Dot />
              Horário ocupado aparece riscado: você só escolhe o que está livre.
            </li>
            <li className="flex gap-3">
              <Dot />
              Teleconsulta em {list(TELE)}.
            </li>
            <li className="flex gap-3">
              <Dot />
              Lembrete um dia antes, com o que levar.
            </li>
          </ul>
          <dl className="mt-8 grid max-w-[380px] gap-2.5 border-t border-el-ink/10 pt-6 text-[15px]">
            {ELO.hours.map((h) => (
              <div key={h.days} className="flex justify-between gap-6">
                <dt className="text-el-mute">{h.days}</dt>
                <dd className="text-right tabular-nums">{h.time}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div
          ref={cardRef}
          className="relative rounded-[26px] border border-el-line bg-el-bg-2 shadow-[0_30px_80px_-50px_rgb(20_32_31/0.55)]"
        >
          {done ? (
            <BookingDone ref={doneRef} done={done} onAgain={again} />
          ) : (
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
              aria-label="Agendamento"
            >
              <Step n={1} title="Especialidade" current={step === 1} summary={step > 1 ? summary1 : undefined} onEdit={() => goto(1)}>
                <fieldset>
                  <legend className="sr-only">Escolha a especialidade</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ELO_SPECIALTIES.map((s) => {
                      const m = eloModes(s);
                      return (
                        <label key={s.id} className="relative cursor-pointer">
                          <input
                            type="radio"
                            name="elo-spec"
                            value={s.id}
                            checked={specialty === s.id}
                            onChange={() => chooseSpecialty(s.id)}
                            className="peer sr-only"
                          />
                          <Choice>
                            <span className="block font-elo text-[16.5px] text-el-ink">{s.name}</span>
                            <span className="mt-0.5 block text-[13.5px] text-el-mute">
                              {s.durationMin} min · {m.length === 2 ? "presencial ou vídeo" : m[0] === "teleconsulta" ? "só por vídeo" : "presencial"}
                            </span>
                          </Choice>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                {spec && modes.length === 2 && (
                  <div className="mt-4 flex items-center justify-between gap-4 rounded-[16px] bg-el-bg px-4 py-3.5">
                    <span id="elo-tele-label">
                      <span className="block font-elo text-[16px] text-el-ink">Teleconsulta</span>
                      <span className="block text-[13.5px] leading-snug text-el-mute">Por vídeo, com o link enviado pelo WhatsApp.</span>
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={mode === "teleconsulta"}
                      aria-labelledby="elo-tele-label"
                      onClick={() => setMode((m) => (m === "teleconsulta" ? "presencial" : "teleconsulta"))}
                      className="group relative h-8 w-14 shrink-0 rounded-full bg-el-ink/20 transition-colors aria-checked:bg-el-acc"
                    >
                      <i className="absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform duration-300 ease-soft group-aria-checked:translate-x-6" />
                    </button>
                  </div>
                )}
                {spec && modes.length === 1 && (
                  <p className="mt-4 rounded-[16px] bg-el-bg px-4 py-3.5 text-[14.5px] leading-snug text-el-mute">
                    {modes[0] === "presencial"
                      ? `${spec.name}: só presencial, ${spec.room?.startsWith("c") ? "no" : "na sala de"} ${eloRoom(spec.room)?.name.toLowerCase()}.`
                      : `${spec.name}: só por teleconsulta, por vídeo.`}
                  </p>
                )}
                <StepNav onNext={() => goto(2)} disabled={!spec} />
              </Step>

              <Step n={2} title="Profissional" current={step === 2} summary={step > 2 ? summary2 : undefined} onEdit={() => goto(2)}>
                {spec && (
                  <fieldset>
                    <legend className="sr-only">Escolha o profissional</legend>
                    <div className="grid gap-2">
                      <label className="relative cursor-pointer">
                        <input type="radio" name="elo-pro" value="first" checked={pro === "first"} onChange={() => choosePro("first")} className="peer sr-only" />
                        <Choice>
                          <span className="block font-elo text-[16.5px] text-el-ink">Primeiro horário disponível</span>
                          <span className="mt-0.5 block text-[13.5px] text-el-mute">
                            {firstNext && now ? (
                              <>
                                {cap(friendlySlot(firstNext, now))} com {eloProfessional(firstNext.professionalId)?.name}
                              </>
                            ) : (
                              "Calculando…"
                            )}
                          </span>
                        </Choice>
                      </label>
                      {eloProfessionalsFor(spec.id).map((p) => {
                        const next = now ? nextFreeForProfessional(p.id, now, 1, 27)[0] : undefined;
                        return (
                          <label key={p.id} className="relative cursor-pointer">
                            <input type="radio" name="elo-pro" value={p.id} checked={pro === p.id} onChange={() => choosePro(p.id)} className="peer sr-only" />
                            <Choice>
                              <span className="block font-elo text-[16.5px] text-el-ink">{p.name}</span>
                              <span className="mt-0.5 block text-[13.5px] text-el-mute">
                                Atende {eloDaysLabel(p.days)}
                                {next && now ? ` · próximo: ${friendlySlot(next, now)}` : ""}
                              </span>
                            </Choice>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                )}
                <StepNav onBack={() => goto(1)} onNext={() => goto(3)} disabled={!pro} />
              </Step>

              <Step n={3} title="Dia e horário" current={step === 3} summary={step > 3 ? summary3 : undefined} onEdit={() => goto(3)}>
                {notice && (
                  <p role="status" className="mb-4 rounded-[14px] bg-el-acc-2/[0.16] px-4 py-3 text-[14.5px] text-[#7a3a1f]">
                    {notice}
                  </p>
                )}
                {spec && now && (
                  <>
                    <BookingCalendar now={now} counts={counts} selected={day} onSelect={chooseDay} />
                    {day ? (
                      <TimeGrid
                        now={now}
                        specialty={spec.id}
                        professionalId={proId}
                        day={day}
                        selected={time}
                        onSelect={(ms) => {
                          setTime(ms);
                          setNotice("");
                        }}
                      />
                    ) : (
                      <p className="mt-5 text-[14.5px] text-el-mute">Escolha um dia com horário livre para ver a grade.</p>
                    )}
                    {slot && (
                      <p className="mt-4 font-elo text-[15.5px] text-el-ink" aria-live="polite">
                        {cap(longDay(slot.start))}, {timeLabel(slot.start)} · {chosenPro?.name} · {spec.durationMin} min
                      </p>
                    )}
                  </>
                )}
                <StepNav onBack={() => goto(2)} onNext={() => goto(4)} disabled={!slot} />
              </Step>

              <Step n={4} title="Seus dados" current={step === 4} last>
                <div className="grid gap-5">
                  {slot && spec && (
                    <p className="rounded-[16px] bg-el-bg px-4 py-3.5 text-[15px] leading-snug text-el-ink">
                      <span className="font-elo font-medium">{spec.name}</span> com {chosenPro?.name}
                      <br />
                      {cap(longDay(slot.start))}, {timeLabel(slot.start)} · {modeLabel(mode)}
                    </p>
                  )}
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Nome do paciente" htmlFor="elo-name" error={errors.name}>
                      <input
                        id="elo-name"
                        name="name"
                        autoComplete="name"
                        value={name}
                        maxLength={LIMITS.nameMax}
                        onChange={(e) => {
                          setName(e.target.value);
                          clear("name");
                        }}
                        onBlur={() => check("name", name.trim().length > 0)}
                        {...described("name")}
                        className={field}
                      />
                    </Field>
                    <Field label="WhatsApp" htmlFor="elo-phone" error={errors.phone}>
                      <input
                        id="elo-phone"
                        name="phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={phone}
                        maxLength={24}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          clear("phone");
                        }}
                        onBlur={() => check("phone", phone.trim().length > 0)}
                        {...described("phone")}
                        placeholder="(48) 99999-0000"
                        className={field}
                      />
                    </Field>
                  </div>
                  <Field label="E-mail" htmlFor="elo-email" error={errors.email} optional>
                    <input
                      id="elo-email"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={email}
                      maxLength={160}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clear("email");
                      }}
                      onBlur={() => check("email", email.trim().length > 0)}
                      {...described("email")}
                      className={field}
                    />
                  </Field>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Segmented
                      id="elo-pay"
                      legend="Pagamento"
                      value={pay}
                      error={errors.pay}
                      options={[
                        { value: "particular", label: "Particular" },
                        { value: "convenio", label: "Convênio" },
                      ]}
                      onChange={(v) => {
                        setPay(v as Pay);
                        clear("pay");
                      }}
                    />
                    <Segmented
                      id="elo-first"
                      legend="Primeira vez na Elo?"
                      value={first}
                      error={errors.first}
                      options={[
                        { value: "sim", label: "Sim" },
                        { value: "nao", label: "Não" },
                      ]}
                      onChange={(v) => {
                        setFirst(v as First);
                        clear("first");
                      }}
                    />
                  </div>
                  {pay === "convenio" && (
                    <p className="-mt-1 text-[14px] leading-snug text-el-mute">
                      Aceitamos particular e convênios; confirme o seu na recepção.
                    </p>
                  )}

                  {/* honeypot: hidden from people, filled by bots */}
                  <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
                    <label htmlFor="elo-company">Empresa</label>
                    <input id="elo-company" name="company" tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
                  </div>

                  {status === "error" && (
                    <p role="alert" className="rounded-[14px] border border-[#b3261e]/30 bg-[#b3261e]/[0.05] px-4 py-3 text-[14.5px] leading-snug text-[#8c1d18]">
                      Não conseguimos enviar agora. Seus dados continuam aqui: confira a conexão e toque em “Tentar novamente”.
                    </p>
                  )}
                  {status === "limited" && (
                    <p role="alert" className="rounded-[14px] border border-[#b3261e]/30 bg-[#b3261e]/[0.05] px-4 py-3 text-[14.5px] leading-snug text-[#8c1d18]">
                      {RATE_LIMITED_MESSAGE}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => goto(3)} className={BTN_GHOST}>
                      <span aria-hidden>←</span> Voltar
                    </button>
                    <button type="submit" disabled={status === "sending" || !slot} className={cn(BTN, "flex-1 sm:flex-none")}>
                      {status === "sending" ? "Enviando…" : status === "error" || status === "limited" ? "Tentar novamente" : "Confirmar agendamento"}
                    </button>
                  </div>
                  <p className="text-[13px] leading-relaxed text-el-mute">
                    {ELO_PRIVACY} Neste demo, só o nome, o WhatsApp e o horário chegam à MatsuHub, que criou o site. Nenhuma
                    informação de saúde é pedida aqui.
                  </p>
                </div>
              </Step>
            </form>
          )}
        </div>
      </div>
    </EloSection>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Dot() {
  return <i aria-hidden className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-el-acc" />;
}

/** One step of the accordion: number, title, a summary + "Alterar" once done, the body while current. */
function Step({
  n,
  title,
  current,
  summary,
  onEdit,
  last,
  children,
}: {
  n: number;
  title: string;
  current: boolean;
  summary?: string;
  onEdit?: () => void;
  last?: boolean;
  children: React.ReactNode;
}) {
  const doneStep = Boolean(summary);
  return (
    <div className={cn("px-5 py-5 sm:px-8 sm:py-6", !last && "border-b border-el-line")}>
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-full font-elo text-[14px] font-medium",
            current ? "bg-el-acc text-white" : doneStep ? "bg-el-acc/[0.1] text-el-acc" : "border border-el-ink/15 text-el-mute",
          )}
        >
          {doneStep && !current ? "✓" : n}
        </span>
        <h3
          id={`elo-step-${n}`}
          tabIndex={-1}
          className={cn("min-w-0 flex-1 font-elo text-[18px] leading-tight outline-none", current || doneStep ? "text-el-ink" : "text-el-mute")}
        >
          <span className="sr-only">Passo {n} de 4: </span>
          {title}
          {summary && !current && <span className="mt-1 block truncate text-[14.5px] text-el-mute">{summary}</span>}
        </h3>
        {summary && !current && onEdit && (
          <button type="button" onClick={onEdit} className="shrink-0 rounded-full px-3 py-2 font-elo text-[14px] text-el-acc underline decoration-el-acc/30 underline-offset-4 hover:decoration-el-acc">
            Alterar<span className="sr-only"> {title.toLowerCase()}</span>
          </button>
        )}
      </div>
      {current && <div className="mt-5 transition-opacity duration-500 starting:opacity-0">{children}</div>}
    </div>
  );
}

function StepNav({ onBack, onNext, disabled }: { onBack?: () => void; onNext: () => void; disabled: boolean }) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      {onBack && (
        <button type="button" onClick={onBack} className={BTN_GHOST}>
          <span aria-hidden>←</span> Voltar
        </button>
      )}
      <button type="button" onClick={onNext} disabled={disabled} className={cn(BTN, "max-sm:flex-1")}>
        Continuar <span aria-hidden>→</span>
      </button>
    </div>
  );
}

/** The visible box of a radio option (the input is the previous sibling, `peer`). */
function Choice({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center justify-between gap-3 rounded-[16px] border border-el-ink/12 bg-el-bg-2 px-4 py-3.5 transition-colors peer-checked:border-el-acc peer-checked:bg-el-acc/[0.06] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-el-acc hover:border-el-acc/50 [.peer:checked+&_.knob]:border-[6px] [.peer:checked+&_.knob]:border-el-acc">
      <span className="min-w-0">{children}</span>
      <i aria-hidden className="knob h-5 w-5 shrink-0 rounded-full border-2 border-el-ink/25 transition-[border-width,border-color] duration-200" />
    </span>
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
      <label htmlFor={htmlFor} className="font-elo text-[15px] text-el-ink">
        {label}
        {optional && <span className="ml-2 text-[13.5px] text-el-mute">opcional</span>}
      </label>
      {children}
      {error && (
        <p id={`${htmlFor}-err`} className="mt-2 text-[14px] text-[#8c1d18]">
          {error}
        </p>
      )}
    </div>
  );
}

function Segmented({
  id,
  legend,
  value,
  options,
  error,
  onChange,
}: {
  id: string;
  legend: string;
  value: string;
  options: { value: string; label: string }[];
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset aria-describedby={error ? `${id}-err` : undefined}>
      <legend className="font-elo text-[15px] text-el-ink">{legend}</legend>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {options.map((o, i) => (
          <label key={o.value} className="relative cursor-pointer">
            <input
              id={i === 0 ? id : undefined}
              type="radio"
              name={id}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              data-invalid={Boolean(error)}
              className="peer sr-only"
            />
            <span className="block rounded-[14px] border border-el-ink/15 bg-el-bg-2 px-3 py-3.5 text-center font-elo text-[15.5px] text-el-ink transition-colors peer-checked:border-el-acc peer-checked:bg-el-acc peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-el-acc peer-data-[invalid=true]:border-[#b3261e] hover:border-el-acc/60">
              {o.label}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id={`${id}-err`} className="mt-2 text-[14px] text-[#8c1d18]">
          {error}
        </p>
      )}
    </fieldset>
  );
}
