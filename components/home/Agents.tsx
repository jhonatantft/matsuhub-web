import { Label } from "@/components/ui/Label";
import { Reveal } from "@/components/ui/Reveal";
import { AgentRun } from "./parts-b/AgentRun";

const PROOFS = [
  { k: "Integrados", t: "Conectados ao seu CRM, agenda, ERP e WhatsApp — agem onde o trabalho acontece." },
  { k: "Contextuais", t: "Treinados nas regras, no catálogo e no tom de voz do seu negócio." },
  { k: "Auditáveis", t: "Cada passo fica registrado; ações sensíveis pedem aprovação humana." },
] as const;

/** "03 — Agentes em ação": what an agent does, shown as a live (scripted) run. */
export function Agents() {
  return (
    <section id="agentes" className="relative px-[var(--pad)] py-[clamp(80px,11vw,150px)]">
      <div className="mx-auto max-w-[1360px]">
        <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-end">
          <div>
            <Reveal>
              <Label>03 — Agentes em ação</Label>
            </Reveal>
            <Reveal as="h2" delay={0.06} className="h-section mt-[18px] max-w-[15ch]">
              Não é chatbot. <span className="text-gradient">É um colega que executa.</span>
            </Reveal>
          </div>

          <div>
            <Reveal as="p" delay={0.1} className="max-w-[48ch] text-[clamp(16px,1.25vw,18px)] text-mute">
              Nossos agentes usam ferramentas, consultam os seus sistemas e concluem tarefas de ponta a ponta — com um
              humano sempre no controle.
            </Reveal>
          </div>
        </div>

        <ul className="mt-10 grid gap-px overflow-hidden rounded-[18px] border border-line bg-line sm:grid-cols-3 lg:mt-14">
          {PROOFS.map((p, i) => (
            <Reveal as="li" key={p.k} delay={0.08 * i} className="bg-bg/95 px-5 py-5 sm:px-6">
              <p className="flex items-center gap-2.5 font-mono text-[11px] tracking-[0.14em] text-acc uppercase">
                <span className="text-dim">0{i + 1}</span>
                <span aria-hidden className="h-px w-5 bg-acc/60" />
                {p.k}
              </p>
              <p className="mt-2 text-[15px] leading-snug text-ink/85">{p.t}</p>
            </Reveal>
          ))}
        </ul>

        <Reveal delay={0.1} className="mt-6 sm:mt-8">
          <AgentRun />
        </Reveal>

        <p className="mt-5 text-center font-mono text-[11px] tracking-[0.06em] text-mute">
          Simulação roteirizada para ilustrar o fluxo. Em produção, o agente opera nos seus sistemas reais.
        </p>
      </div>
    </section>
  );
}
