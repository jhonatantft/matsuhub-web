"use client";

import Image from "next/image";
import { eloProfessionalsFor, eloRoom, eloSpecialty, type EloSpecialtyId } from "@/content/clinica";
import { friendlySlot, nextFreeForSpecialty, slotsForSpecialtyDay, timeLabel } from "@/lib/clinica/availability";
import { book, showRoom, useNow, SECTION } from "./bus";
import { BTN, BTN_GHOST, EloHeading, EloSection, Tag } from "./ui";

/** What is in each room's photo (public/clinica/view-*.jpg), and nothing more. */
const EXAMS: { id: EloSpecialtyId; cta: string; room: string }[] = [
  { id: "ultrassom", cta: "Agendar ultrassom", room: "O aparelho de ultrassom fica ao lado da maca, com uma tela na parede." },
  { id: "coleta", cta: "Agendar coleta", room: "Duas poltronas reclináveis junto à janela, com a bancada da coleta ao lado." },
];

/**
 * "Exames no mesmo dia": ultrasound and blood collection, with the rooms' photos, generic
 * preparation from the data, and today's free times computed live (booking shortcuts).
 */
export function SiteExams() {
  const now = useNow();

  return (
    <EloSection id={SECTION.exams} labelledBy="elo-exams-title" className="bg-el-bg">
      <EloHeading
        id="elo-exams-title"
        eyebrow="Exames no mesmo dia"
        title={
          <>
            Consulta e exame <em>no mesmo endereço.</em>
          </>
        }
        lead="Ultrassonografia e coleta de sangue ficam na própria clínica, à direita da sala de espera. Com horário livre, dá para fazer no mesmo dia da consulta."
      />

      <div className="mt-12 grid gap-6 lg:mt-14 lg:grid-cols-2">
        {EXAMS.map((exam) => {
          const spec = eloSpecialty(exam.id)!;
          const room = eloRoom(spec.room)!;
          const team = eloProfessionalsFor(spec.id)
            .map((p) => (/^(Dra?\.|Nut\.)/.test(p.name) ? p.name : `a ${p.name.toLowerCase()}`))
            .join(", ");
          const today = now
            ? slotsForSpecialtyDay(spec.id, now, now)
                .filter((s) => s.free)
                .slice(0, 4)
            : [];
          const next = now && today.length === 0 ? nextFreeForSpecialty(spec.id, now, 1, 27)[0] : undefined;

          return (
            <article key={exam.id} className="flex flex-col overflow-hidden rounded-[26px] border border-el-line bg-el-bg-2">
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image src={room.view.small} alt={room.view.alt} fill sizes="(min-width: 1024px) 600px, 100vw" className="object-cover" />
              </div>
              <div className="flex flex-1 flex-col p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag tone="acc">{room.name}</Tag>
                  <Tag>{spec.durationMin} min</Tag>
                </div>
                <h3 className="mt-4 font-elo text-[clamp(24px,2.4vw,30px)] leading-tight font-medium text-el-ink">{spec.name}</h3>
                <p className="mt-2 text-[16px] leading-relaxed text-el-mute">
                  {spec.short}. {exam.room}
                </p>
                <p className="mt-1 text-[14px] text-el-mute">Com {team}.</p>

                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <div>
                    <p className="font-elo text-[16px] text-el-ink">Como se preparar</p>
                    <ul className="mt-2.5 grid gap-2 text-[15px] leading-snug text-el-ink">
                      {spec.prepare.map((item) => (
                        <li key={item} className="flex gap-3">
                          <i aria-hidden className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-el-acc" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-[13.5px] leading-snug text-el-mute">O preparo exato vem no pedido médico. Na dúvida, a recepção confirma.</p>
                  </div>
                  <div>
                    <p className="font-elo text-[16px] text-el-ink">{today.length > 0 ? "Ainda hoje" : "Próximo horário"}</p>
                    {!now && <div aria-hidden className="mt-2.5 h-[46px] animate-pulse rounded-[12px] bg-el-bg motion-reduce:animate-none" />}
                    {today.length > 0 && (
                      <ul className="mt-2.5 grid grid-cols-4 gap-1.5 sm:grid-cols-2">
                        {today.map((s) => (
                          <li key={s.start.getTime()}>
                            <button
                              type="button"
                              onClick={() => book({ specialty: spec.id, professionalId: s.professionalId, start: s.start.toISOString() })}
                              aria-label={`Agendar ${spec.name.toLowerCase()} hoje às ${timeLabel(s.start)}`}
                              className="w-full rounded-[12px] border border-el-acc/30 py-3 font-elo text-[15.5px] leading-none text-el-acc tabular-nums transition-colors hover:border-el-acc hover:bg-el-acc/[0.06]"
                            >
                              {timeLabel(s.start)}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {next && now && (
                      <button
                        type="button"
                        onClick={() => book({ specialty: spec.id, professionalId: next.professionalId, start: next.start.toISOString() })}
                        className="mt-2.5 w-full rounded-[12px] border border-el-acc/30 px-4 py-3 text-left font-elo text-[15.5px] text-el-acc transition-colors first-letter:uppercase hover:border-el-acc hover:bg-el-acc/[0.06]"
                      >
                        {friendlySlot(next, now)}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-auto flex flex-wrap gap-3 pt-7">
                  <button type="button" onClick={() => book({ specialty: spec.id })} className={BTN}>
                    {exam.cta}
                  </button>
                  <button type="button" onClick={() => showRoom(room.id)} className={BTN_GHOST}>
                    Ver a sala no tour
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </EloSection>
  );
}
