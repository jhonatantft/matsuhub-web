"use client";

import { ELO, eloProfessional, eloSpecialty, isEloExam, type EloMode, type EloSpecialtyId } from "@/content/clinica";
import { longDay, timeLabel } from "@/lib/clinica/availability";
import { modeLabel } from "./booking";
import { scrollToSection, SECTION } from "./bus";
import { BTN, BTN_GHOST } from "./ui";

export type Done = {
  specialty: EloSpecialtyId;
  professionalId: string;
  /** Start of the slot (ms). */
  start: number;
  mode: EloMode;
  bring: string[];
  firstName: string;
  /** Blob URL of the .ics, made in the submit handler. */
  icsUrl: string;
};

const pad = (n: number) => String(n).padStart(2, "0");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Step 5: the confirmation card, with a real .ics, the illustrative reminder and what to bring. */
export function BookingDone({ ref, done, onAgain }: { ref: React.Ref<HTMLHeadingElement>; done: Done; onAgain: () => void }) {
  const spec = eloSpecialty(done.specialty)!;
  const pro = eloProfessional(done.professionalId);
  const start = new Date(done.start);
  const when = `${cap(longDay(start))}, às ${timeLabel(start)}`;
  const kind = isEloExam(spec.id) ? spec.name : `consulta de ${spec.name.toLowerCase()}`;
  const wd = start.toLocaleDateString("pt-BR", { weekday: "long" });
  const reminder = [
    `Olá, ${done.firstName}! Lembrete da ${ELO.full}: sua ${kind} com ${pro?.name} é amanhã, ${wd}, ${pad(start.getDate())}/${pad(start.getMonth() + 1)}, às ${timeLabel(start)}.`,
    done.mode === "teleconsulta" ? "O link da teleconsulta chega por aqui 15 minutos antes." : `Endereço: ${ELO.address}.`,
    "Responda 1 para confirmar ou 2 para remarcar.",
  ].join(" ");

  return (
    <div role="status" className="p-5 transition-opacity duration-700 starting:opacity-0 sm:p-8">
      <div className="flex items-start gap-4">
        <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-el-acc text-[20px] text-white">
          ✓
        </span>
        <div>
          <h3 ref={ref} tabIndex={-1} className="font-elo text-[clamp(22px,2.4vw,28px)] leading-tight font-medium text-el-ink outline-none">
            Pedido de agendamento enviado, {done.firstName}.
          </h3>
          <p className="mt-1.5 text-[15px] text-el-mute">A confirmação chegaria pelo WhatsApp em instantes.</p>
        </div>
      </div>

      <dl className="mt-6 grid gap-x-6 gap-y-3 rounded-[18px] bg-el-bg p-5 text-[15px] sm:grid-cols-[auto_1fr]">
        <dt className="text-el-mute">{isEloExam(spec.id) ? "Exame" : "Especialidade"}</dt>
        <dd className="font-elo text-el-ink">{spec.name}</dd>
        <dt className="text-el-mute">Com</dt>
        <dd className="text-el-ink">{pro?.name}</dd>
        <dt className="text-el-mute">Quando</dt>
        <dd className="text-el-ink">
          {when} · {spec.durationMin} min
        </dd>
        <dt className="text-el-mute">{done.mode === "teleconsulta" ? "Como" : "Onde"}</dt>
        <dd className="text-el-ink">{done.mode === "teleconsulta" ? `${modeLabel(done.mode)}: o link chega pelo WhatsApp` : ELO.address}</dd>
      </dl>

      <div className="mt-5 flex flex-wrap gap-3">
        <a href={done.icsUrl} download="consulta-elo.ics" className={BTN}>
          <svg aria-hidden width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2.5" y="3.5" width="13" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M2.5 7.5h13M6 2v3M12 2v3M9 10v3.5M7.25 11.75h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Adicionar à agenda
        </a>
        <button type="button" onClick={() => scrollToSection(SECTION.precheck)} className={BTN_GHOST}>
          Preparar a pré-consulta
        </button>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div>
          <p className="font-elo text-[16.5px] text-el-ink">O que levar</p>
          <ul className="mt-3 grid gap-2.5 text-[15px] leading-snug text-el-ink">
            {done.bring.map((item) => (
              <li key={item} className="flex gap-3">
                <i aria-hidden className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-el-acc" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <figure>
          <figcaption className="flex flex-wrap items-center gap-2 font-elo text-[16.5px] text-el-ink">
            Lembrete por WhatsApp
            <span className="rounded-full bg-el-acc-2/[0.18] px-2.5 py-1 text-[12px] leading-none text-[#7a3a1f]">exemplo ilustrativo</span>
          </figcaption>
          <div className="mt-3 rounded-[18px] bg-[#e7ece6] p-3.5">
            <p className="rounded-[14px_14px_14px_4px] bg-el-bg-2 px-3.5 py-3 text-[14.5px] leading-snug text-el-ink shadow-[0_1px_0_rgb(20_32_31/0.08)]">
              {reminder}
              <span className="mt-1.5 block text-right text-[11.5px] text-el-mute">na véspera, 9:00</span>
            </p>
          </div>
        </figure>
      </div>

      <p className="mt-8 border-t border-el-line pt-5 text-[13.5px] leading-relaxed text-el-mute">
        Site-demo: a {ELO.name} e os profissionais são fictícios, e nenhuma consulta foi marcada de verdade. Num site real, o
        pedido entraria direto na agenda da clínica e a confirmação sairia pelo WhatsApp.
      </p>
      <button
        type="button"
        onClick={onAgain}
        className="mt-4 font-elo text-[15px] text-el-acc underline decoration-el-acc/30 underline-offset-4 hover:decoration-el-acc"
      >
        Fazer outro agendamento
      </button>
    </div>
  );
}
