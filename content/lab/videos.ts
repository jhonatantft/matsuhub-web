import type { Lang, Localized } from "@/lib/i18n/core";
import { LAB_INDEX_PATH, type LabId } from "./index";

/**
 * Videos of Quarxel, the Lab's YouTube channel (in English). Each video has a page in the Lab
 * (/laboratorio/videos/<slug> · /en/lab/videos/<slug>) with the video, its chapters, every
 * source, the full research and the narration — the "Sources and corrections" link of the
 * channel. The long data of each video lives in content/lab/videos/<id>.json, generated from the
 * channel's script and upload sheet by scripts/lab-video-json.py, and only that video's page imports it.
 *
 * Adding a video: one entry here, its JSON, and two route folders (copy one-blink's).
 */
type L = Localized<string>;

export const QUARXEL = { name: "Quarxel", handle: "@Quarxel", url: "https://www.youtube.com/@Quarxel" } as const;

export const VIDEO_IDS = ["one-blink"] as const;
export type VideoId = (typeof VIDEO_IDS)[number];
export const isVideoId = (key: string): key is VideoId => (VIDEO_IDS as readonly string[]).includes(key);

export type LabVideo = {
  id: VideoId;
  youtubeId: string;
  /** Same in both languages. */
  slug: string;
  /** The series name shown on the video's title card. */
  series: string;
  /** The title as published on YouTube (English). */
  youtubeTitle: string;
  /** Headline, first line and second line (gradient). */
  title: L;
  accent: L;
  /** Card text and meta description. */
  summary: L;
  /** ISO date it went public. */
  published: string;
  duration: string;
  /** ISO 8601 duration, for structured data. */
  durationIso: string;
  /** The Lab explainer about the same thing. */
  lab: LabId;
  /** Corrections made after publishing, newest first. */
  corrections: readonly { date: string; text: L }[];
  /** What the next video is about, as the video announces it. */
  next?: L;
};

export const LAB_VIDEOS: readonly LabVideo[] = [
  {
    id: "one-blink",
    youtubeId: "RpmxQpbKxEs",
    slug: "one-blink",
    series: "One Blink",
    youtubeTitle: "What Happens When You Type a URL and Press Enter, Slowed Down",
    title: { pt: "A internet em câmera lenta:", en: "The internet in slow motion:" },
    accent: { pt: "o que acontece quando você aperta Enter.", en: "what happens when you press Enter." },
    summary: {
      pt: "Meio segundo esticado em dez minutos: a tecla, o DNS, o aperto de mão TCP, a criptografia, a luz na fibra, o servidor e a página sendo desenhada. Com o relógio de um carregamento real da wikipedia.org e toda a pesquisa por trás de cada número.",
      en: "Half a second stretched across ten minutes: the key, DNS, the TCP handshake, encryption, light in the fibre, the server and the page being drawn. With the clock from one real, measured load of wikipedia.org and all the research behind every number.",
    },
    published: "2026-11-18",
    duration: "10:06",
    durationIso: "PT10M6S",
    lab: "one-click",
    corrections: [],
    next: { pt: "Por que a luz não escapa da fibra de vidro.", en: "Why the light does not leak out of the glass fibre." },
  },
];

export const videoById = (id: VideoId): LabVideo => LAB_VIDEOS.find((video) => video.id === id)!;
export const videosForLab = (lab: LabId) => LAB_VIDEOS.filter((video) => video.lab === lab);
export const videoPath = (id: VideoId, lang: Lang) => `${LAB_INDEX_PATH[lang]}/videos/${videoById(id).slug}`;
export const youtubeWatch = (youtubeId: string, seconds?: number) =>
  `https://www.youtube.com/watch?v=${youtubeId}${seconds ? `&t=${seconds}s` : ""}`;
/** 4:3 with letterbox bars; shown with object-cover in a 16:9 frame, the bars fall outside. */
export const youtubeThumb = (youtubeId: string) => `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;

export const VIDEO_UI = {
  kind: { pt: "Vídeo · Quarxel", en: "Video · Quarxel" },
  videos: { pt: "Vídeos", en: "Videos" },
  channel: {
    pt: "Quarxel é o canal de vídeos do Lab MatsuHub: física e computação explicadas até a menor peça. As cenas são animações feitas em código, a narração é uma voz de IA e cada número é checado numa fonte.",
    en: "Quarxel is the MatsuHub Lab's video channel: physics and computing, explained down to the smallest piece. Every scene is animation rendered in code, the narration is an AI voice and every figure is checked against a source.",
  },
  english: {
    pt: "O vídeo é em inglês, e a pesquisa e a narração abaixo estão na língua do vídeo.",
    en: "",
  },
  play: { pt: "Assistir ao vídeo", en: "Play the video" },
  watchOn: { pt: "Ver no YouTube", en: "Watch on YouTube" },
  subscribe: { pt: "Conhecer o canal", en: "Visit the channel" },
  tryIt: { pt: "Experimente você mesmo", en: "Try it yourself" },
  chapters: { pt: "Capítulos", en: "Chapters" },
  chaptersHint: { pt: "Toque num capítulo para assistir a partir dele.", en: "Tap a chapter to play from there." },
  about: { pt: "Sobre o vídeo", en: "About the video" },
  howMade: { pt: "Como foi feito", en: "How it is made" },
  howMadeLines: [
    {
      pt: "Visual: animação renderizada em código (React e Remotion), sem imagens filmadas ou de banco.",
      en: "Visuals: animation rendered in code (React and Remotion). No filmed or stock footage.",
    },
    {
      pt: "Narração: uma voz de IA. Música: gerada por IA (Suno). Efeitos sonoros: sintetizados em código.",
      en: "Narration: an AI voice. Music: AI-generated (Suno). Sound effects: synthesized in code.",
    },
    {
      pt: "Cada número é checado nas fontes abaixo. Onde um número não pôde ser confirmado, o roteiro fica vago de propósito.",
      en: "Every figure is checked against the sources below. Where a number could not be confirmed, the script stays loose on purpose.",
    },
  ],
  sources: { pt: "Fontes", en: "Sources" },
  research: { pt: "A pesquisa completa", en: "The full research" },
  researchLead: {
    pt: "Tudo o que foi checado antes de o vídeo ir ao ar: o que as fontes confirmaram, o que foi medido, o que mudou no roteiro depois da checagem, o que ficou vago de propósito e o que o vídeo simplifica.",
    en: "Everything checked before the video went out: what the sources confirmed, what was measured, what changed in the script after checking, what stays loose on purpose and what the video simplifies.",
  },
  narration: { pt: "A narração completa", en: "The full narration" },
  narrationOpen: { pt: "Ler a narração, cena por cena", en: "Read the narration, scene by scene" },
  corrections: { pt: "Correções", en: "Corrections" },
  noCorrections: {
    pt: "Nenhuma correção até agora. Viu um erro? Comente no vídeo: ele é checado contra uma fonte e, se for o caso, corrigido aqui.",
    en: "No corrections so far. Spotted a mistake? Comment on the video: it gets checked against a source and, if needed, corrected here.",
  },
  next: { pt: "Próximo vídeo", en: "Next video" },
  sectionLabel: { pt: "04 — Vídeos do Quarxel", en: "04 — Quarxel videos" },
  sectionTitle: { pt: "Assista, depois mexa.", en: "Watch it, then play with it." },
  sectionLead: {
    pt: "Cada vídeo do canal acompanha um experimento do Lab, com todas as fontes e a pesquisa por trás de cada número.",
    en: "Each video on the channel goes with a Lab explainer, with every source and the research behind every number.",
  },
  fromVideo: { pt: "Vídeo sobre este assunto", en: "A video about this" },
  researchLink: { pt: "Fontes e pesquisa do vídeo", en: "The video's sources and research" },
  open: { pt: "Ver vídeo e pesquisa", en: "Video and research" },
} as const;
