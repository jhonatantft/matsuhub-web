/**
 * Sample data for the "Elo" clinic demo. Everything here is fictional: the clinic, the
 * professionals (no registration numbers on purpose), the schedule and the address.
 * The images in /public/clinica were AI-generated. `floor` (a cut-away model seen from above)
 * is the master layout: the facade and every view were generated FROM it, so they match.
 * Any new picture of this clinic must be generated the same way and compared with it.
 * This file is imported by client and server code, so it must stay free of browser-only code.
 */

export type EloImage = { src: string; small: string; alt: string; width: number; height: number };

const wide = (name: string, alt: string): EloImage => ({
  src: `/clinica/${name}.jpg`,
  small: `/clinica/${name}-1600.jpg`,
  alt,
  width: 2688,
  height: 1520,
});

export const ELO = {
  name: "Elo",
  full: "Elo Clínica Integrada",
  tagline: "Cuidado que começa antes da consulta.",
  domain: "eloclinica.com.br",
  address: "Rua das Palmeiras, 410 · Centro",
  hours: [
    { days: "Segunda a sexta", time: "7h às 19h" },
    { days: "Sábado", time: "8h às 12h" },
  ],
  facts: [
    { value: "4", label: "especialidades no local" },
    { value: "Online", label: "agendamento 24 h" },
    { value: "Mesmo dia", label: "exames de imagem e coleta" },
    { value: "Tele", label: "teleconsulta disponível" },
  ],
} as const;

export const ELO_MEDIA = {
  /** The street front: glass facade, entrance at the left, sign "ELO". */
  facade: wide("facade", "Fachada de vidro da clínica Elo, com a recepção e a sala de espera visíveis"),
  /** The master layout: cut-away model of the whole floor. */
  floor: wide("floor", "A clínica Elo em corte, vista de cima: recepção, sala de espera, quatro consultórios, exames e coleta"),
} as const;

export type EloRoomId = "recepcao" | "espera" | "c1" | "c2" | "c3" | "c4" | "exames" | "coleta";
export type EloSpecialtyId = "clinica-geral" | "cardiologia" | "dermatologia" | "pediatria" | "ultrassom" | "coleta" | "nutricao";

/** The four consultation rooms are identical in the model, so they share one photo. */
const consultorio = wide("view-consultorio", "Consultório com mesa, duas cadeiras e maca");

/** Areas of the floor, left to right along the back wall, then the front. */
export const ELO_ROOMS: { id: EloRoomId; name: string; note: string; specialty?: EloSpecialtyId; view: EloImage }[] = [
  { id: "recepcao", name: "Recepção", note: "Check-in pelo celular ou no balcão", view: wide("view-espera", "Sala de espera com poltronas verdes diante de uma parede de plantas") },
  { id: "espera", name: "Sala de espera", note: "Luz natural, parede de plantas e poltronas", view: wide("view-espera", "Sala de espera com poltronas verdes diante de uma parede de plantas") },
  { id: "c1", name: "Consultório 1", note: "Clínica geral", specialty: "clinica-geral", view: consultorio },
  { id: "c2", name: "Consultório 2", note: "Cardiologia", specialty: "cardiologia", view: consultorio },
  { id: "c3", name: "Consultório 3", note: "Dermatologia", specialty: "dermatologia", view: consultorio },
  { id: "c4", name: "Consultório 4", note: "Pediatria", specialty: "pediatria", view: consultorio },
  { id: "exames", name: "Exames de imagem", note: "Ultrassonografia no mesmo dia", specialty: "ultrassom", view: wide("view-exames", "Sala de exames com aparelho de ultrassom ao lado da maca") },
  { id: "coleta", name: "Coleta", note: "Exames de sangue, sem fila", specialty: "coleta", view: wide("view-coleta", "Sala de coleta com duas poltronas reclináveis") },
];

export const ELO_SPECIALTIES: { id: EloSpecialtyId; name: string; short: string; room?: EloRoomId; durationMin: number; tele: boolean; prepare: string[] }[] = [
  { id: "clinica-geral", name: "Clínica geral", short: "Check-up, sintomas do dia a dia e encaminhamentos", room: "c1", durationMin: 30, tele: true, prepare: ["Documento com foto", "Lista dos remédios que você usa", "Exames recentes, se tiver"] },
  { id: "cardiologia", name: "Cardiologia", short: "Pressão, coração e avaliação para atividade física", room: "c2", durationMin: 40, tele: true, prepare: ["Documento com foto", "Exames do coração anteriores, se tiver", "Lista dos remédios que você usa"] },
  { id: "dermatologia", name: "Dermatologia", short: "Pele, cabelo, unhas e acompanhamento de pintas", room: "c3", durationMin: 30, tele: false, prepare: ["Documento com foto", "Venha sem maquiagem se a consulta for de rosto"] },
  { id: "pediatria", name: "Pediatria", short: "Consultas de rotina e acompanhamento do crescimento", room: "c4", durationMin: 40, tele: true, prepare: ["Documento da criança", "Caderneta de vacinação"] },
  { id: "ultrassom", name: "Ultrassonografia", short: "Exames de imagem com laudo no mesmo dia", room: "exames", durationMin: 20, tele: false, prepare: ["Pedido médico", "Siga o preparo indicado no pedido"] },
  { id: "coleta", name: "Coleta de sangue", short: "Exames laboratoriais, com horário marcado", room: "coleta", durationMin: 10, tele: false, prepare: ["Pedido médico", "Siga o jejum indicado no pedido, se houver"] },
  { id: "nutricao", name: "Nutrição", short: "Plano alimentar e acompanhamento, por teleconsulta", durationMin: 45, tele: true, prepare: ["Exames recentes, se tiver"] },
];

/** Fictional professionals. No registration numbers: this is a demo. */
export const ELO_PROFESSIONALS: { id: string; name: string; specialty: EloSpecialtyId; days: number[] }[] = [
  { id: "helena", name: "Dra. Helena Prado", specialty: "clinica-geral", days: [1, 2, 3, 4, 5] },
  { id: "rafael", name: "Dr. Rafael Moura", specialty: "clinica-geral", days: [1, 3, 5, 6] },
  { id: "andre", name: "Dr. André Valença", specialty: "cardiologia", days: [2, 4] },
  { id: "camila", name: "Dra. Camila Rocha", specialty: "dermatologia", days: [1, 2, 4] },
  { id: "beatriz", name: "Dra. Beatriz Lins", specialty: "pediatria", days: [1, 2, 3, 4, 5, 6] },
  { id: "paulo", name: "Dr. Paulo Arantes", specialty: "ultrassom", days: [1, 2, 3, 4, 5] },
  { id: "enfermagem", name: "Equipe de enfermagem", specialty: "coleta", days: [1, 2, 3, 4, 5, 6] },
  { id: "marina", name: "Nut. Marina Costa", specialty: "nutricao", days: [2, 3, 5] },
];

/** Opening hours as [startHour, endHour) per weekday (0 = Sunday). */
export const ELO_OPEN: Record<number, [number, number] | null> = {
  0: null,
  1: [7, 19],
  2: [7, 19],
  3: [7, 19],
  4: [7, 19],
  5: [7, 19],
  6: [8, 12],
};

/** "Iris", the scripted AI receptionist of the demo (a simulation, not a live model). */
export const IRIS = {
  name: "Iris",
  role: "recepção virtual · IA",
  greeting:
    "Olá! Sou a Iris, da recepção da Elo. Posso marcar consultas e exames, remarcar e explicar o preparo. Não faço diagnóstico nem dou orientação médica.",
  chips: ["Quero marcar uma consulta", "Preciso remarcar", "Como é o preparo do exame?"],
  /**
   * Safety: any message that looks like an emergency gets this answer FIRST, whatever else it
   * asks. The demo must never try to triage or advise in these cases.
   */
  emergency: {
    keywords: [
      "dor no peito", "falta de ar", "não consigo respirar", "desmaio", "desmaiou", "convulsão",
      "sangramento", "sangrando", "avc", "derrame", "infarto", "paralisia", "boca torta", "envenenamento",
    ],
    reply:
      "Isso pode ser uma emergência. Ligue agora para o SAMU, no 192, ou vá ao pronto-socorro mais próximo. A recepção virtual não faz atendimento de urgência.",
  },
  /** Mentions of self-harm get a dedicated answer with the CVV line. */
  crisis: {
    keywords: ["suicídio", "me matar", "tirar minha vida", "não quero mais viver", "me machucar"],
    reply:
      "Sinto muito que você esteja passando por isso. Dá para conversar com alguém agora: ligue 188 (CVV), a qualquer hora e de graça, ou 192 se estiver em perigo agora.",
  },
} as const;

export const ELO_PRIVACY =
  "Os dados informados aqui são usados só para o agendamento, conforme a LGPD. Neste site-demo nada é enviado à clínica: é uma simulação.";

/* ---------------------------------------------------------------- lookups (pure, shared) */

export type EloSpecialty = (typeof ELO_SPECIALTIES)[number];
export type EloProfessional = (typeof ELO_PROFESSIONALS)[number];
export type EloRoom = (typeof ELO_ROOMS)[number];
export type EloMode = "presencial" | "teleconsulta";

export const eloSpecialty = (id: string | undefined) => ELO_SPECIALTIES.find((s) => s.id === id);
export const eloProfessional = (id: string | undefined) => ELO_PROFESSIONALS.find((p) => p.id === id);
export const eloRoom = (id: string | undefined) => ELO_ROOMS.find((r) => r.id === id);
export const eloProfessionalsFor = (specialty: EloSpecialtyId) => ELO_PROFESSIONALS.filter((p) => p.specialty === specialty);

/** How a specialty can be booked: no room on the floor = teleconsulta only (Nutrição). */
export function eloModes(spec: EloSpecialty): EloMode[] {
  if (!spec.room) return ["teleconsulta"];
  return spec.tele ? ["presencial", "teleconsulta"] : ["presencial"];
}

/** Exams (no consultation): the two rooms at the right of the floor. */
export const isEloExam = (id: EloSpecialtyId) => id === "ultrassom" || id === "coleta";

const WEEKDAY_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** [1, 3, 5, 6] → "seg, qua, sex e sáb" */
export function eloDaysLabel(days: number[]): string {
  const names = [...days].sort((a, b) => a - b).map((d) => WEEKDAY_SHORT[d]);
  if (names.length === 5 && days.every((d) => d >= 1 && d <= 5)) return "seg a sex";
  if (names.length === 6 && days.every((d) => d >= 1)) return "seg a sáb";
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}
