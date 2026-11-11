import { AURORA, AURORA_UNITS, brl, LIA, type AuroraUnit } from "@/content/aurora";
import { ordinalFloor } from "../views";

/**
 * Lia's branching script for the demo page (a simulation: no model is called). Every answer is
 * a step: what Lia says, the quick replies she offers next, and an optional page action.
 */
export type LiaAction =
  | { kind: "unit"; unit: AuroraUnit }
  | { kind: "scroll"; to: "finance" | "units" }
  | { kind: "visit"; message: string };

export type LiaStep = { say: string[]; replies: string[]; action?: LiaAction };

export const THREE_SUITES = AURORA_UNITS.filter((u) => u.suites === 3 && u.status === "disponível")
  .sort((a, b) => b.floor - a.floor)
  .slice(0, 3);

export const DAYS = ["Sábado", "Domingo", "Durante a semana"] as const;
export const HOURS = ["10h", "14h", "17h"] as const;

const MAIN = [...LIA.chips];
const unitReply = (u: AuroraUnit) => `Ver a ${u.id} no prédio`;

export const LIA_START: LiaStep = { say: [LIA.greeting], replies: [...MAIN, "Quando fica pronto?"] };

/** Conversation memory the script needs (the visit day chosen before the hour). */
export type LiaMemory = { day?: string };

/** Answer a quick reply or typed text. */
export function liaAnswer(input: string, memory: LiaMemory): LiaStep {
  const text = input.toLowerCase();

  const unit = THREE_SUITES.find((u) => input === unitReply(u));
  if (unit) {
    return {
      say: [`Pronto: a ${unit.id} está acesa na fachada, lá em cima. ${ordinalFloor(unit.floor)}, frente mar.`],
      replies: ["Simular financiamento", "Agendar visita"],
      action: { kind: "unit", unit },
    };
  }

  if ((DAYS as readonly string[]).includes(input)) {
    memory.day = input;
    return { say: ["Perfeito. E qual horário prefere?"], replies: [...HOURS] };
  }

  if ((HOURS as readonly string[]).includes(input)) {
    const day = memory.day ?? "Sábado";
    const when = `${day === "Durante a semana" ? "um dia da semana" : day.toLowerCase()}, às ${input}`;
    return {
      say: [
        `Combinado: separei ${when}, no stand do ${AURORA.name} ✓`,
        "Para eu confirmar, deixe seu WhatsApp no formulário aqui embaixo — já anotei o horário na mensagem.",
      ],
      replies: ["Ver residências de 3 suítes", "Simular financiamento"],
      action: { kind: "visit", message: `Gostaria de visitar ${when}.` },
    };
  }

  if (/su[ií]te|3|tr[eê]s|unidade|residên|apart/.test(text)) {
    return {
      say: [
        "Temos estas residências de 3 suítes disponíveis, todas com 127 m² de frente para o mar:",
        THREE_SUITES.map((u) => `${u.id} · ${ordinalFloor(u.floor)} · ${brl(u.price)}`).join("\n"),
        "Quer que eu mostre alguma no prédio?",
      ],
      replies: [...THREE_SUITES.map(unitReply), "Agendar visita"],
    };
  }

  if (/financ|parcela|simul|entrada|banco/.test(text)) {
    return {
      say: ["Abri o simulador para você. Ajuste o valor, a entrada e o prazo: a parcela é calculada pela tabela Price."],
      replies: ["Agendar visita", "Ver residências de 3 suítes"],
      action: { kind: "scroll", to: "finance" },
    };
  }

  if (/visit|agend|conhecer|stand|decorado/.test(text)) {
    return { say: ["Ótimo! O decorado fica aberto todos os dias. Qual dia fica melhor para você?"], replies: [...DAYS] };
  }

  if (/pronto|entrega|obra|quando/.test(text)) {
    return {
      say: [`${AURORA.delivery}. Quer conhecer o decorado enquanto isso?`],
      replies: ["Agendar visita", "Ver residências de 3 suítes"],
    };
  }

  return {
    say: ["Nesta demonstração eu respondo por um roteiro. Posso te ajudar com uma destas opções:"],
    replies: MAIN,
  };
}
