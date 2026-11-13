/**
 * "Como a IA escreve" (components/lab/nextword): interface copy. The training text is the help
 * center of the semantic-search experiment (content/lab/semantic-search), so both share one corpus.
 */
export const NEXT_COPY = {
  aria: { pt: "Modelo de linguagem escrevendo palavra por palavra", en: "Language model writing word by word" },
  starts: { pt: "Comece com", en: "Start with" },
  own: { pt: "Ou escreva o começo", en: "Or write the beginning" },
  ownPlaceholder: { pt: "ex.: o frete", en: "e.g. shipping is" },
  use: { pt: "Usar", en: "Use" },
  next: { pt: "Próxima palavra", en: "Next word" },
  auto: { pt: "Escrever sozinho", en: "Write on its own" },
  pause: { pt: "Pausar", en: "Pause" },
  reset: { pt: "Recomeçar", en: "Start over" },
  temperature: { pt: "Temperatura {t}", en: "Temperature {t}" },
  tempScale: { pt: ["previsível", "equilibrado", "criativo", "caótico"], en: ["predictable", "balanced", "creative", "chaotic"] },
  looking: { pt: "Olhando para", en: "Looking at" },
  candidates: { pt: "Próximas palavras possíveis", en: "Possible next words" },
  drawn: { pt: "Sorteada: {w} ({p})", en: "Drawn: {w} ({p})" },
  end: { pt: "fim da frase", en: "end of sentence" },
  unknown: {
    pt: "Essa palavra nunca apareceu no treino. O modelo não tem o que dizer: ele só sabe continuar o que já viu.",
    en: "That word never appeared in training. The model has nothing to say: it can only continue what it has seen.",
  },
  legend: { pt: ["provável", "possível", "improvável"], en: ["likely", "possible", "unlikely"] },
  loopTitle: { pt: "O loop de toda IA que escreve", en: "The loop of every AI that writes" },
  loop: {
    pt: ["Lê as últimas palavras", "Calcula a chance de cada próxima", "Sorteia uma", "Junta ao texto e repete"],
    en: ["Reads the last words", "Works out each next word's chance", "Draws one", "Adds it to the text and repeats"],
  },
  compareTitle: { pt: "Este modelo × um modelo grande", en: "This model × a large model" },
  compare: {
    rows: {
      pt: ["Memória (contexto)", "Vocabulário", "Treino"],
      en: ["Memory (context)", "Vocabulary", "Training"],
    },
    mine: { pt: ["2 palavras", "{vocab} palavras", "{sentences} frases"], en: ["2 words", "{vocab} words", "{sentences} sentences"] },
    big: {
      pt: ["centenas de milhares de tokens", "dezenas de milhares de tokens", "trilhões de tokens"],
      en: ["hundreds of thousands of tokens", "tens of thousands of tokens", "trillions of tokens"],
    },
    us: { pt: "aqui", en: "here" },
    them: { pt: "LLM", en: "LLM" },
  },
  hallucination: {
    pt: "Suba a temperatura e leia com atenção: as frases continuam fluentes, mas começam a misturar fatos. É assim que a IA inventa.",
    en: "Turn the temperature up and read carefully: sentences stay fluent but start mixing facts. That's how AI makes things up.",
  },
} as const;
