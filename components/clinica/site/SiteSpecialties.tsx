"use client";

import { eloDaysLabel, eloModes, eloProfessional, eloProfessionalsFor, eloRoom, ELO_SPECIALTIES, type EloSpecialty } from "@/content/clinica";
import { friendlySlot, nextFreeForSpecialty } from "@/lib/clinica/availability";
import { book, emitSite, showRoom, useNow, SECTION } from "./bus";
import { BTN_GHOST, EloHeading, EloSection, Tag } from "./ui";

/**
 * "Especialidades": one card per specialty with who attends, on which days, and the next free
 * time computed live from lib/clinica/availability (the same slots the booking and Iris use).
 */
export function SiteSpecialties() {
  const now = useNow();

  return (
    <EloSection id={SECTION.specialties} labelledBy="elo-spec-title" className="bg-el-bg">
      <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
        <EloHeading
          id="elo-spec-title"
          eyebrow="Especialidades"
          title={
            <>
              Quem atende, quando, e o <em>próximo horário livre.</em>
            </>
          }
          lead="Os horários abaixo são calculados agora, a partir da mesma agenda do agendamento online."
        />
        <p aria-hidden className="font-elo text-[14px] text-el-mute sm:hidden">
          Deslize para ver todas →
        </p>
      </div>

      <ul
        aria-label="Especialidades"
        className="mt-8 grid gap-4 sm:mt-12 max-sm:-mx-[var(--pad)] max-sm:flex max-sm:snap-x max-sm:snap-mandatory max-sm:scroll-px-[var(--pad)] max-sm:overflow-x-auto max-sm:px-[var(--pad)] max-sm:pb-2 max-sm:[scrollbar-width:none] sm:grid-cols-2 lg:mt-14 lg:grid-cols-4 lg:gap-5"
      >
        {ELO_SPECIALTIES.map((spec) => (
          <li key={spec.id} className="max-sm:w-[84%] max-sm:shrink-0 max-sm:snap-start">
            <SpecialtyCard spec={spec} now={now} />
          </li>
        ))}
        <li className="max-sm:w-[84%] max-sm:shrink-0 max-sm:snap-start">
          <div className="flex h-full flex-col justify-between rounded-[22px] bg-el-acc p-6 text-white">
            <div>
              <p className="font-elo text-[20px] leading-tight font-medium">Ficou em dúvida sobre onde marcar?</p>
              <p className="mt-3 text-[15px] leading-relaxed text-white/85">
                A Iris, recepção virtual, mostra horários, explica o preparo dos exames e tira dúvidas sobre a clínica. Ela não
                faz diagnóstico.
              </p>
            </div>
            <button
              type="button"
              onClick={() => emitSite("iris", {})}
              className="mt-6 inline-flex items-center justify-center gap-2 self-start rounded-full bg-white px-5 py-3.5 font-elo text-[15px] leading-none font-medium text-el-acc transition-colors hover:bg-el-bg"
            >
              Falar com a Iris <span aria-hidden>→</span>
            </button>
          </div>
        </li>
      </ul>
    </EloSection>
  );
}

function SpecialtyCard({ spec, now }: { spec: EloSpecialty; now: Date | null }) {
  const pros = eloProfessionalsFor(spec.id);
  const modes = eloModes(spec);
  const room = eloRoom(spec.room);
  const next = now ? nextFreeForSpecialty(spec.id, now, 1, 27)[0] : undefined;
  const nextPro = next ? eloProfessional(next.professionalId) : undefined;

  return (
    <article className="flex h-full flex-col rounded-[22px] border border-el-line bg-el-bg-2 p-6 shadow-[0_18px_40px_-34px_rgb(20_32_31/0.45)]">
      <p className="font-elo text-[12.5px] tracking-[0.12em] text-el-mute uppercase">{room ? room.name : "Por vídeo"}</p>
      <h3 className="mt-2 font-elo text-[22px] leading-tight font-medium text-el-ink">{spec.name}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-el-mute">{spec.short}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <Tag>{spec.durationMin} min</Tag>
        {modes.length === 2 && <Tag tone="acc">Presencial ou teleconsulta</Tag>}
        {modes.length === 1 && modes[0] === "presencial" && <Tag>Só presencial</Tag>}
        {modes.length === 1 && modes[0] === "teleconsulta" && <Tag tone="acc">Só teleconsulta</Tag>}
      </div>

      <ul className="mt-5 grid gap-2 border-t border-el-line pt-4">
        {pros.map((p) => (
          <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-x-3 text-[14.5px]">
            <span className="text-el-ink">{p.name}</span>
            <span className="text-[13px] text-el-mute">{eloDaysLabel(p.days)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-5">
        {next ? (
          <button
            type="button"
            onClick={() => book({ specialty: spec.id, professionalId: next.professionalId, start: next.start.toISOString() })}
            className="group/n flex w-full items-center justify-between gap-3 rounded-[16px] bg-el-bg px-4 py-3 text-left transition-colors hover:bg-el-acc/[0.08]"
          >
            <span>
              <span className="block text-[12.5px] text-el-mute">Próximo horário</span>
              <span className="mt-0.5 block font-elo text-[17px] font-medium text-el-ink first-letter:uppercase">{friendlySlot(next, now!)}</span>
              <span className="block text-[13px] text-el-mute">{nextPro?.name}</span>
            </span>
            <span aria-hidden className="font-elo text-[18px] text-el-acc transition-transform duration-300 group-hover/n:translate-x-0.5">
              →
            </span>
          </button>
        ) : (
          <div aria-hidden className="h-[84px] animate-pulse rounded-[16px] bg-el-bg motion-reduce:animate-none" />
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => book({ specialty: spec.id })}
            className="inline-flex flex-auto items-center justify-center rounded-full bg-el-acc px-5 py-3 font-elo text-[15px] leading-none font-medium text-white transition-colors hover:bg-[#0b4642]"
          >
            Agendar
          </button>
          {room && (
            <button type="button" onClick={() => showRoom(room.id)} className={`${BTN_GHOST} flex-auto px-4 py-3`}>
              {spec.id === "ultrassom" || spec.id === "coleta" ? "Ver a sala" : "Ver o consultório"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
