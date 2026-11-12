"use client";

import Image from "next/image";
import { ELO, ELO_MEDIA, ELO_OPEN, ELO_PRIVACY } from "@/content/clinica";
import { addDays } from "@/lib/clinica/availability";
import { scrollToSection, SECTION, useNow } from "./bus";
import { BTN, BTN_GHOST, EloHeading, EloSection } from "./ui";

const DAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** "Aberto agora · fecha às 19h" or "Fechado agora · abre amanhã às 7h", from ELO_OPEN. */
function openState(now: Date): { open: boolean; text: string } {
  const today = ELO_OPEN[now.getDay()];
  const hour = now.getHours() + now.getMinutes() / 60;
  if (today && hour >= today[0] && hour < today[1]) return { open: true, text: `Aberto agora · fecha às ${today[1]}h` };
  for (let d = 0; d <= 7; d++) {
    const day = addDays(now, d);
    const hours = ELO_OPEN[day.getDay()];
    if (!hours || (d === 0 && hour >= hours[0])) continue;
    const when = d === 0 ? "hoje" : d === 1 ? "amanhã" : DAY_NAMES[day.getDay()];
    return { open: false, text: `Fechado agora · abre ${when} às ${hours[0]}h` };
  }
  return { open: false, text: "Fechado agora" };
}

/** "Onde & horários": address, hours, how to arrive, with the facade photo. No embedded map. */
export function SiteWhere() {
  const now = useNow();
  const state = now ? openState(now) : null;
  const closed = Object.entries(ELO_OPEN)
    .filter(([, h]) => !h)
    .map(([d]) => DAY_NAMES[Number(d)]);

  return (
    <EloSection id={SECTION.where} labelledBy="elo-where-title" className="bg-el-bg-2">
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <figure>
          <div className="relative aspect-[16/10] overflow-hidden rounded-[26px] ring-1 ring-el-line max-sm:-mx-[var(--pad)] max-sm:aspect-[4/3] max-sm:rounded-none">
            <Image
              src={ELO_MEDIA.facade.small}
              alt={ELO_MEDIA.facade.alt}
              fill
              sizes="(min-width: 1024px) 640px, 100vw"
              className="object-cover object-[18%_50%]"
            />
          </div>
          <figcaption className="mt-3 text-[13.5px] text-el-mute">A fachada de vidro, com a porta de entrada à esquerda.</figcaption>
        </figure>

        <div>
          <EloHeading
            id="elo-where-title"
            eyebrow="Onde & horários"
            title={
              <>
                No centro, <em>no térreo.</em>
              </>
            }
          />
          <address className="mt-7 font-elo text-[clamp(22px,2.2vw,28px)] leading-snug text-el-ink not-italic">{ELO.address}</address>
          {state && (
            <p className="mt-3 flex items-center gap-2.5 font-elo text-[15px] text-el-ink">
              <i aria-hidden className={state.open ? "h-2.5 w-2.5 rounded-full bg-[#2f8f5b]" : "h-2.5 w-2.5 rounded-full bg-el-acc-2"} />
              {state.text}
            </p>
          )}

          <dl className="mt-7 grid max-w-[420px] gap-2.5 border-t border-el-line pt-6 text-[15.5px]">
            {ELO.hours.map((h) => (
              <div key={h.days} className="flex justify-between gap-6">
                <dt className="text-el-mute">{h.days}</dt>
                <dd className="text-right tabular-nums">{h.time}</dd>
              </div>
            ))}
            {closed.length > 0 && (
              <div className="flex justify-between gap-6">
                <dt className="text-el-mute first-letter:uppercase">{closed.join(" e ")}</dt>
                <dd className="text-right">fechado</dd>
              </div>
            )}
          </dl>

          <p className="mt-6 max-w-[48ch] text-[15.5px] leading-relaxed text-el-mute">
            Chegando: a porta fica no canto esquerdo da fachada de vidro, com a recepção logo à frente. Faça o check-in no balcão
            ou pelo link que chega no WhatsApp. Na teleconsulta, o link da chamada chega pelo mesmo WhatsApp.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {/* TODO: real WhatsApp link (https://wa.me/<número>) when this becomes a client site */}
            <a href="#" onClick={(event) => event.preventDefault()} className={BTN_GHOST}>
              WhatsApp
            </a>
            <a
              href={`#${SECTION.booking}`}
              onClick={(event) => {
                event.preventDefault();
                scrollToSection(SECTION.booking);
              }}
              className={BTN}
            >
              Agendar consulta <span aria-hidden>→</span>
            </a>
          </div>

          <p className="mt-8 max-w-[52ch] border-t border-el-line pt-5 text-[13.5px] leading-relaxed text-el-mute">{ELO_PRIVACY}</p>
        </div>
      </div>
    </EloSection>
  );
}
