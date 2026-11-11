import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Reveal } from "@/components/ui/Reveal";
import { LeadForm } from "./parts-b/LeadForm";

const NEXT = [
  { n: "01", t: "Lemos com atenção", d: "Sua mensagem chega direto para quem vai construir — sem triagem de vendas." },
  { n: "02", t: "Uma conversa rápida", d: "Entendemos o negócio, o objetivo e onde a IA realmente gera resultado." },
  { n: "03", t: "Plano e protótipo", d: "Você recebe escopo, prazo e um protótipo navegável para validar a ideia." },
] as const;

/** "05 — Contato": the closing call to action with the lead form. */
export function Contact() {
  return (
    <section id="contato" className="relative overflow-hidden px-[var(--pad)] py-[clamp(90px,12vw,170px)]">
      {/* light behind the headline + orbit rings */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute top-[18%] left-1/2 aspect-square w-[min(1100px,140vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(62_242_196/0.16),rgb(185_255_75/0.05)_55%,transparent)]" />
        <svg
          viewBox="0 0 800 800"
          className="absolute top-[18%] left-1/2 w-[min(1000px,130vw)] -translate-x-1/2 -translate-y-1/2 opacity-60"
          fill="none"
        >
          <circle cx="400" cy="400" r="250" stroke="rgb(190 255 215 / 0.10)" />
          <circle cx="400" cy="400" r="330" stroke="rgb(190 255 215 / 0.07)" strokeDasharray="2 7" />
          <circle cx="400" cy="400" r="395" stroke="rgb(190 255 215 / 0.05)" />
          <g className="origin-center animate-spin-slow [animation-duration:40s] [transform-box:fill-box]">
            <circle cx="400" cy="400" r="330" stroke="url(#contact-arc)" strokeWidth="1.5" strokeDasharray="180 1900" />
          </g>
          <defs>
            <linearGradient id="contact-arc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#b9ff4b" stopOpacity="0" />
              <stop offset="1" stopColor="#b9ff4b" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="relative mx-auto max-w-[1360px]">
        <div className="text-center">
          <Reveal>
            <Label dot className="justify-center">
              05 — Contato
            </Label>
          </Reveal>
          <Reveal
            as="h2"
            delay={0.06}
            className="mx-auto mt-6 font-display text-[clamp(44px,8.4vw,136px)] leading-[0.98] font-extrabold tracking-[-0.045em]"
          >
            Vamos construir <span className="block text-bg [paint-order:stroke_fill] [-webkit-text-stroke:clamp(2.5px,0.26vw,4px)_var(--color-acc)]">
              o seu?
            </span>
          </Reveal>
          <Reveal as="p" delay={0.14} className="mx-auto mt-7 max-w-[46ch] text-[clamp(16px,1.3vw,19px)] text-mute">
            Conte a ideia. Voltamos com um plano claro e um protótipo — para você ver funcionando antes de investir.
          </Reveal>
        </div>

        <div className="mt-[clamp(48px,6vw,84px)] grid items-start gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-12">
          <Reveal delay={0.1} className="relative">
            {/* gradient hairline border */}
            <div className="rounded-[28px] bg-[linear-gradient(150deg,rgb(185_255_75/0.45),rgb(190_255_215/0.10)_30%,rgb(190_255_215/0.06)_70%,rgb(62_242_196/0.35))] p-px shadow-[0_50px_140px_-70px_rgb(185_255_75/0.55)]">
              <div className="relative overflow-hidden rounded-[27px] bg-[rgb(7_13_10/0.82)] px-5 py-7 backdrop-blur-xl sm:px-9 sm:py-9">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgb(185_255_75/0.14),transparent)]"
                />
                <div className="relative mb-7 flex items-center justify-between gap-4 border-b border-line pb-5">
                  <h3 className="font-display text-[19px] font-semibold tracking-[-0.02em] sm:text-[22px]">Inicie um projeto</h3>
                  <span className="hidden sm:block">
                    <span className="chip">
                      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-acc-2 shadow-[0_0_8px_var(--color-acc-2)]" />
                      resposta humana
                    </span>
                  </span>
                </div>
                <div className="relative">
                  <LeadForm />
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal as="aside" delay={0.18} className="lg:pt-4">
            <p className="label">O que acontece depois</p>
            <ol className="mt-6 grid gap-0">
              {NEXT.map((s, i) => (
                <li key={s.n} className="relative grid grid-cols-[44px_1fr] pb-7 last:pb-0">
                  {i < NEXT.length - 1 && (
                    <span aria-hidden className="absolute top-9 bottom-1 left-[15px] w-px bg-[linear-gradient(var(--color-line-2),transparent)]" />
                  )}
                  <span className="grid h-8 w-8 place-items-center rounded-full border border-line-2 font-mono text-[11px] text-acc">
                    {s.n}
                  </span>
                  <div>
                    <h3 className="text-[16px] font-semibold text-ink">{s.t}</h3>
                    <p className="mt-1 text-[14.5px] leading-snug text-mute">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-10 border-t border-line pt-8">
              <p className="text-[14.5px] text-mute">Prefere conversar direto?</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {/* TODO: real WhatsApp link (https://wa.me/55DDDNUMERO) — the owner has not provided it yet. */}
                <Button href="#" variant="ghost" arrow="↗">
                  Falar no WhatsApp
                </Button>
                {/* TODO: real address (mailto:contato@…) — the owner has not provided it yet. */}
                <Button href="#" variant="ghost" arrow="↗">
                  Enviar e-mail
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
