import {
  ELO,
  ELO_OPEN,
  ELO_PROFESSIONALS,
  ELO_SPECIALTIES,
  IRIS,
  eloModes,
  eloProfessional,
  eloSpecialty,
  isEloExam,
  type EloMode,
  type EloSpecialtyId,
} from "@/content/clinica";
import { friendlySlot, nextFreeForProfessional, nextFreeForSpecialty, type EloSlot } from "@/lib/clinica/availability";
import { getLastBooked, plain, SECTION, type BookPrefill } from "./bus";

/**
 * Iris's script. Scripted, but every answer is computed from content/clinica.ts and
 * lib/clinica/availability.ts (specialties, professionals, hours, real free slots), so she never
 * disagrees with the page. No model is called and nothing leaves the browser.
 *
 * Order of checks for every message, non-negotiable:
 *   1. safety — crisis and emergency keywords (accents and case ignored) → the exact replies from
 *      IRIS, and nothing else in that turn (no chips, no booking);
 *   2. requests for a diagnosis, a medicine, a dose or a medical opinion → a polite refusal and
 *      "agende com um profissional";
 *   3. only then: reschedule, teleconsulta, convênio/prices, preparation, hours/address, booking.
 */

export type IrisAction = { kind: "book"; prefill: BookPrefill } | { kind: "scroll"; to: string };
export type IrisReply = { label: string; next?: (now: Date) => IrisStep };
export type IrisStep = { say: string[]; replies: IrisReply[]; action?: IrisAction; alert?: boolean };

const list = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`);
const lower = (id: EloSpecialtyId) => eloSpecialty(id)!.name.toLowerCase();
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------------------------------------------------------------- 1. safety */

/** IRIS's own keywords, plus the words for "urgent" (the clinic has no urgent care). */
const EMERGENCY = [...IRIS.emergency.keywords, "urgencia", "emergencia", "urgente", "pronto-socorro", "pronto socorro"].map(plain);
const CRISIS = IRIS.crisis.keywords.map(plain);

/** The exact safety replies a message triggers (crisis first), or null. */
export function safetyReplies(text: string): string[] | null {
  const t = plain(text);
  const out: string[] = [];
  if (CRISIS.some((k) => t.includes(k))) out.push(IRIS.crisis.reply);
  if (EMERGENCY.some((k) => t.includes(k))) out.push(IRIS.emergency.reply);
  return out.length > 0 ? out : null;
}

/* ---------------------------------------------------------------- 2. medical opinion */

/** Asking for a diagnosis, a medicine, a dose or an opinion about a symptom. */
const OPINION: RegExp[] = [
  /diagnost/,
  /o que (eu )?(tenho|posso ter)\b/,
  /o que (pode|deve|sera que) (ser|e)\b/,
  /\b(e|sera que e|eh) grave\b/,
  /\be normal\b/,
  /devo me preocupar/,
  /\b(dose|dosagem|posologia)\b/,
  /\d+ ?(mg|ml|gotas)\b/,
  /quant[oa]s? (comprimidos?|gotas|ml|capsulas?|vezes por dia)/,
  /\b(posso|devo|preciso) (tomar|parar de tomar|misturar|beber)\b/,
  /\b(qual|que) (remedio|medicamento|antibiotico|pomada|cha)\b/,
  /\b(remedio|medicamento|antibiotico|pomada|cha) (pra|para|contra)\b/,
  /\b(como|o que fazer (pra|para)) (tratar|curar|melhorar|aliviar|passar)\b/,
  /\btratamento (pra|para|de)\b/,
  /\b(receita|prescreve|prescricao)\b/,
  /\b(indica|recomenda)\w* (um |uma |algum |alguma )?(remedio|medicamento|tratamento|pomada)/,
  /efeito colateral|interacao/,
  /\be contagioso\b/,
];

/** Symptoms: Iris doesn't comment on them (unless the visitor only wants to book). */
const SYMPTOM =
  /\b(dor|dores|doendo|febre|tosse|enjoo|nausea|vomit\w*|tontura|coceira|manchas?|inchac\w*|inchad\w*|diarreia|gripe|resfriado|pressao alta|palpitac\w*|sintomas?|machuquei|ferida|caroco|nodulo)\b/;

const BOOK_INTENT = /\b(marcar|agendar|agendamento|consulta|horarios?|vagas?|atendimento|atende|disponivel|disponibilidade)\b/;

/* ---------------------------------------------------------------- data lookups */

const SPEC_WORDS: [EloSpecialtyId, RegExp][] = [
  ["clinica-geral", /clinic[oa][ -]geral|check.?up|generalista|medico de familia/],
  ["cardiologia", /cardio/],
  ["dermatologia", /dermato/],
  ["pediatria", /pediat|crianca|\bfilh[oa]s?\b|\bbebe\b/],
  ["ultrassom", /ultra.?som|ultrassonografia|ecografia/],
  ["coleta", /coleta|exames? de sangue|hemograma|laboratori/],
  ["nutricao", /nutri|\bdieta\b|plano alimentar/],
];

const findSpecialty = (t: string) => SPEC_WORDS.find(([, re]) => re.test(t))?.[0];

/** A professional named in the message ("dra helena", "com o rafael"). */
function findProfessional(t: string) {
  return ELO_PROFESSIONALS.find((p) => {
    if (!/^(Dra?\.|Nut\.)/.test(p.name)) return false;
    const first = plain(p.name.replace(/^(Dra?\.|Nut\.)\s*/, "").split(" ")[0]);
    return new RegExp(`\\b${first}\\b`).test(t);
  });
}

const wantsTele = (t: string) => /\b(tele|teleconsulta|tele-consulta|online|on-line|por video|video ?chamada|a distancia|remot\w*)\b/.test(t);

/** "Dra. Helena" (title + first name); the nursing team has no title. */
const shortName = (name: string) => {
  const m = name.match(/^(Dra?\.|Nut\.)\s*(\S+)/);
  return m ? `${m[1]} ${m[2]}` : "";
};

/* ---------------------------------------------------------------- steps */

export const IRIS_START: IrisStep = {
  say: [IRIS.greeting],
  replies: IRIS.chips.map((label) => ({ label })),
};

function slotReplies(slots: EloSlot[], mode: EloMode, now: Date): IrisReply[] {
  return slots.map((s) => {
    const pro = eloProfessional(s.professionalId);
    const who = shortName(pro?.name ?? "");
    const label = `${cap(friendlySlot(s, now))}${who ? ` · ${who}` : ""}`;
    return {
      label,
      next: () => ({
        say: [
          `Pronto: deixei ${lower(s.specialty)} com ${pro?.name}, ${friendlySlot(s, now)}${mode === "teleconsulta" ? ", por teleconsulta" : ""}, separado no agendamento. Falta só o nome e o WhatsApp.`,
        ],
        replies: [],
        action: { kind: "book", prefill: { specialty: s.specialty, professionalId: s.professionalId, start: s.start.toISOString(), mode } },
      }),
    };
  });
}

/** The next three free times of a specialty (or of one professional) as buttons. */
export function slotsStep(specialty: EloSpecialtyId, now: Date, opts: { professionalId?: string; mode?: EloMode; lead?: string } = {}): IrisStep {
  const spec = eloSpecialty(specialty)!;
  const modes = eloModes(spec);
  const mode: EloMode = opts.mode && modes.includes(opts.mode) ? opts.mode : modes[0];
  const pro = eloProfessional(opts.professionalId);
  const slots = pro ? nextFreeForProfessional(pro.id, now, 3, 27) : nextFreeForSpecialty(specialty, now, 3, 27);
  if (slots.length === 0) {
    return {
      say: [`Não encontrei horário livre de ${spec.name.toLowerCase()} nas próximas quatro semanas. A recepção pode abrir um encaixe: deixe seu WhatsApp no agendamento.`],
      replies: [],
      action: { kind: "book", prefill: { specialty, mode } },
    };
  }
  const who = pro ? `com ${pro.name}` : `de ${spec.name.toLowerCase()}`;
  const how = mode === "teleconsulta" ? " por teleconsulta" : "";
  return {
    say: [
      ...(opts.lead ? [opts.lead] : []),
      `Os próximos horários ${who}${how} (${spec.durationMin} min):`,
    ],
    replies: [
      ...slotReplies(slots, mode, now),
      {
        label: "Ver outros dias",
        next: () => ({
          say: [`Abri o agendamento de ${spec.name.toLowerCase()}: escolha o dia no calendário.`],
          replies: [],
          action: { kind: "book", prefill: { specialty, professionalId: pro?.id, mode } },
        }),
      },
    ],
  };
}

function askSpecialty(lead: string, mode?: EloMode): IrisStep {
  const specs = mode === "teleconsulta" ? ELO_SPECIALTIES.filter((s) => eloModes(s).includes("teleconsulta")) : ELO_SPECIALTIES;
  return {
    say: [lead],
    replies: specs.map((s) => ({ label: s.name, next: (now: Date) => slotsStep(s.id, now, { mode }) })),
  };
}

function refusal(t: string): IrisStep {
  const spec = findSpecialty(t);
  return {
    say: [
      "Essa eu não posso responder: não faço diagnóstico, não indico remédio nem dose e não dou opinião médica. Para isso, agende com um profissional, que pode examinar você.",
      ...(SYMPTOM.test(t) ? ["Se os sintomas forem fortes ou começaram de repente, ligue 192."] : []),
    ],
    replies: [
      spec
        ? { label: `Horários de ${lower(spec)}`, next: (now: Date) => slotsStep(spec, now) }
        : { label: "Horários de clínica geral", next: (now: Date) => slotsStep("clinica-geral", now) },
      { label: "Ver especialidades", next: () => ({ say: ["Aqui estão as especialidades, com o próximo horário de cada uma."], replies: [], action: { kind: "scroll", to: SECTION.specialties } }) },
    ],
  };
}

function rescheduleStep(): IrisStep {
  const booked = getLastBooked();
  const pick = askSpecialty("Qual é a especialidade da consulta? Abro o agendamento para você escolher o novo horário.");
  if (booked) {
    return {
      say: ["Qual consulta você quer remarcar?"],
      replies: [
        {
          label: booked.label,
          next: () => ({
            say: [
              "Abri o agendamento com a mesma especialidade e o mesmo profissional: escolha o novo dia e horário. Num site real, o horário antigo seria liberado assim que você confirmasse o novo.",
            ],
            replies: [],
            action: { kind: "book", prefill: { specialty: booked.specialty, professionalId: booked.professionalId, mode: booked.mode } },
          }),
        },
        { label: "Outra consulta", next: () => pick },
      ],
    };
  }
  return {
    say: [
      "Qual consulta você quer remarcar? Neste site-demo não há consultas reais no seu nome, então eu abro o agendamento para você escolher o novo horário.",
    ],
    replies: pick.replies,
  };
}

function prepareStep(spec: EloSpecialtyId): IrisStep {
  const s = eloSpecialty(spec)!;
  const what = isEloExam(spec) ? s.name.toLowerCase() : `consulta de ${s.name.toLowerCase()}`;
  return {
    say: [
      `Para ${what}:\n${s.prepare.map((p) => `• ${p}`).join("\n")}`,
      isEloExam(spec)
        ? "O preparo exato, como o tempo de jejum, vem no pedido médico. Na dúvida, a recepção confirma pelo WhatsApp."
        : "Se for a primeira vez na Elo, chegue 15 minutos antes para o cadastro.",
    ],
    replies: [{ label: `Marcar ${s.name.toLowerCase()}`, next: (now: Date) => slotsStep(spec, now) }],
  };
}

function hoursStep(): IrisStep {
  const closed = Object.entries(ELO_OPEN)
    .filter(([, h]) => !h)
    .map(([d]) => ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"][Number(d)]);
  return {
    say: [
      `Funcionamos ${list(ELO.hours.map((h) => `${h.days.toLowerCase()}, das ${h.time}`))}${closed.length ? `; ${list(closed)}, fechado` : ""}.`,
      `Fica na ${ELO.address}. A porta é no canto esquerdo da fachada de vidro.`,
    ],
    replies: [
      { label: "Ver como chegar", next: () => ({ say: ["Mostrei o endereço e os horários na página."], replies: [], action: { kind: "scroll", to: SECTION.where } }) },
      { label: "Quero marcar uma consulta" },
    ],
  };
}

function teleStep(t: string, now: Date): IrisStep {
  const spec = findSpecialty(t);
  const tele = ELO_SPECIALTIES.filter((s) => eloModes(s).includes("teleconsulta"));
  const only = ELO_SPECIALTIES.filter((s) => !eloModes(s).includes("teleconsulta"));
  if (spec) {
    const s = eloSpecialty(spec)!;
    if (eloModes(s).includes("teleconsulta")) return slotsStep(spec, now, { mode: "teleconsulta", lead: `Sim, ${s.name.toLowerCase()} tem teleconsulta, por vídeo. O link chega pelo WhatsApp.` });
    return slotsStep(spec, now, { lead: `${s.name} é só presencial, aqui na clínica.` });
  }
  return {
    say: [
      `Tem teleconsulta, por vídeo, em ${list(tele.map((s) => s.name.toLowerCase()))}. O link chega pelo WhatsApp alguns minutos antes.`,
      `${cap(list(only.map((s) => s.name.toLowerCase())))} são só presenciais.`,
    ],
    replies: tele.map((s) => ({ label: `${s.name} por vídeo`, next: (n: Date) => slotsStep(s.id, n, { mode: "teleconsulta" }) })),
  };
}

const CONVENIO = "Aceitamos particular e convênios; confirme o seu na recepção.";

/* ---------------------------------------------------------------- router */

/** Iris's answer to a typed message. `now` is read by the caller in its handler. */
export function irisAnswer(text: string, now: Date): IrisStep {
  // 1. safety, before anything else — and nothing else in this turn
  const safety = safetyReplies(text);
  if (safety) return { say: safety, replies: [], alert: true };

  const t = plain(text);
  const spec = findSpecialty(t);
  const pro = findProfessional(t);
  const book = BOOK_INTENT.test(t);

  // 2. no diagnosis, no medicines, no doses, no opinions
  if (OPINION.some((re) => re.test(t)) || (SYMPTOM.test(t) && !book && !spec)) return refusal(t);

  // 3. the receptionist's work
  if (/remarc|reagend|desmarc|cancel|(mudar|trocar) (o |de )?(horario|dia)/.test(t)) return rescheduleStep();
  if (/convenio|plano de saude|carteirinha|particular|reembolso|unimed|amil|bradesco|sulamerica|hapvida|notredame/.test(t)) {
    return { say: [CONVENIO, "No agendamento, é só marcar “Convênio” e levar a carteirinha no dia."], replies: [{ label: "Quero marcar uma consulta" }] };
  }
  if (/\b(preco|precos|valor|valores|quanto custa|quanto e|custa)\b/.test(t)) {
    return {
      say: ["Os valores dependem da especialidade e da forma de pagamento; a recepção informa junto com a confirmação.", CONVENIO],
      replies: [{ label: "Quero marcar uma consulta" }],
    };
  }
  if (wantsTele(t)) return teleStep(t, now);
  if (/alergi|alergic/.test(t)) {
    return {
      say: ["Anote as alergias na pré-consulta, aqui na página: vira um resumo para levar ao atendimento e fica só no seu aparelho. Quem avalia é o profissional, na consulta."],
      replies: [{ label: "Abrir a pré-consulta", next: () => ({ say: ["Pronto, é logo ali."], replies: [], action: { kind: "scroll", to: SECTION.precheck } }) }],
    };
  }
  if (/telefone|whats|zap|contato|ligar|falar com (alguem|a recepcao|uma pessoa|atendente)/.test(t)) {
    return {
      say: ["O WhatsApp da recepção fica em “Onde & horários”. Neste site-demo o botão não liga para ninguém, mas eu resolvo agendamento, remarcação e preparo por aqui."],
      replies: [{ label: "Ver onde fica", next: () => ({ say: ["Mostrei na página."], replies: [], action: { kind: "scroll", to: SECTION.where } }) }],
    };
  }
  if (/prepar|jejum|\blevar\b|o que levo|documento|pedido medico|antes do exame|antes da consulta/.test(t)) {
    if (spec) return prepareStep(spec);
    const exam = /exame/.test(t);
    return {
      say: [exam ? "Claro. Para qual exame?" : "Claro. É para qual exame ou consulta?"],
      replies: ELO_SPECIALTIES.filter((s) => !exam || isEloExam(s.id)).map((s) => ({ label: s.name, next: () => prepareStep(s.id) })),
    };
  }
  if (/funcionamento|que horas (abre|fecha)|\b(abre|fecha|abrem|fecham|aberto|aberta)\b|endereco|onde fica|onde voces|como cheg|localizac|estacion|domingo|feriado/.test(t)) {
    return hoursStep();
  }
  if (pro) return slotsStep(pro.specialty, now, { professionalId: pro.id });
  if (spec) return slotsStep(spec, now);
  if (book) return askSpecialty("Claro! Para qual especialidade ou exame?");
  if (/^(oi|ola|bom dia|boa tarde|boa noite|e ai|tudo bem)/.test(t)) {
    return { say: ["Olá! Como posso ajudar?"], replies: IRIS_START.replies };
  }
  if (/obrigad|valeu|agradec/.test(t)) {
    return { say: ["Por nada! Se precisar, é só chamar."], replies: [] };
  }
  return {
    say: ["Posso marcar consultas e exames, remarcar, explicar o preparo e informar horários e endereço. O que você precisa?"],
    replies: IRIS_START.replies,
  };
}
