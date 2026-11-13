import type { LabBlock } from "./index";

/**
 * "Como funciona" under each "para todos" explainer. Plain language first, the technical name in
 * passing. Every claim describes code in components/lab/{password,click,nextword}.
 */

export const PASSWORD: readonly LabBlock[] = [
  { type: "h2", text: { pt: "De onde vêm os números", en: "Where the numbers come from" } },
  {
    type: "list",
    items: [
      {
        pt: "Força bruta: as opções por caractere (26 minúsculas, 26 maiúsculas, 10 números, 33 símbolos) elevadas ao tamanho da senha. É o teto: testar absolutamente tudo.",
        en: "Brute force: the options per character (26 lowercase, 26 uppercase, 10 digits, 33 symbols) raised to the password's length. That's the ceiling: trying absolutely everything.",
      },
      {
        pt: "Estimativa realista: o medidor procura o que os atacantes testam primeiro (senhas famosas, palavras de dicionário com maiúscula, letras trocadas por símbolos, números e datas no final, sequências de teclado, repetições, frases de palavras) e fica com o menor dos dois números.",
        en: "Realistic estimate: the meter looks for what attackers try first (famous passwords, dictionary words with a capital, letters swapped for symbols, numbers and dates at the end, keyboard runs, repetition, phrases of words) and keeps the smaller of the two numbers.",
      },
      {
        pt: "Tempo: metade das tentativas (em média, a senha aparece no meio do caminho) dividida pela velocidade de cada situação.",
        en: "Time: half the guesses (on average, the password turns up halfway through) divided by the speed of each situation.",
      },
    ],
  },
  { type: "h2", text: { pt: "Por que \"vazou\" muda tudo", en: "Why \"leaked\" changes everything" } },
  {
    type: "p",
    text: {
      pt: "Um site sério não guarda a sua senha: guarda um hash, uma impressão digital que não dá para desfazer. Quando um banco de dados vaza, o atacante calcula o hash de cada palpite no próprio computador, sem limite de tentativas. Aí o que manda é o custo de cada cálculo. O MD5 foi feito para ser rápido: uma placa de vídeo faz bilhões por segundo. O bcrypt foi feito para ser lento de propósito, e dá para deixá-lo mais lento conforme os computadores melhoram.",
      en: "A serious site doesn't store your password: it stores a hash, a fingerprint that can't be reversed. When a database leaks, the attacker hashes every guess on their own machine, with no limit on attempts. Then what matters is the cost of each calculation. MD5 was made to be fast: a graphics card does billions per second. bcrypt was made slow on purpose, and it can be made slower as computers get faster.",
    },
  },
  {
    type: "callout",
    text: {
      pt: "Do nosso lado, senha só se guarda com algoritmo lento e sal (bcrypt, scrypt ou Argon2). Do seu lado: tamanho, uma senha por site e verificação em duas etapas.",
      en: "On our side, passwords are only stored with a slow, salted algorithm (bcrypt, scrypt or Argon2). On yours: length, one password per site and two-step verification.",
    },
  },
  { type: "h2", text: { pt: "O gerador", en: "The generator" } },
  {
    type: "p",
    text: {
      pt: "As senhas são sorteadas com `crypto.getRandomValues`, o gerador criptográfico do navegador, com amostragem por rejeição para nenhuma palavra ou caractere sair mais que outro. A frase usa uma lista de 256 palavras sem acento; a aleatória, um alfabeto de 71 caracteres sem os que se confundem (l, 1, O, 0). A força mostrada supõe que o atacante conhece a lista e o método, que é o jeito honesto de medir.",
      en: "Passwords are drawn with `crypto.getRandomValues`, the browser's cryptographic generator, with rejection sampling so no word or character comes up more than another. The phrase uses a list of over 250 words with no accents; the random one, a 71-character alphabet without look-alikes (l, 1, O, 0). The strength shown assumes the attacker knows the list and the method, which is the honest way to measure.",
    },
  },
  {
    type: "callout",
    text: {
      pt: "São estimativas em ordem de grandeza: o medidor reconhece os padrões mais comuns, não todos. Uma senha que parece forte aqui pode já estar em algum vazamento antigo.",
      en: "These are order-of-magnitude estimates: the meter recognises the most common patterns, not all of them. A password that looks strong here may already be in some old leak.",
    },
  },
];

export const ONE_CLICK: readonly LabBlock[] = [
  { type: "h2", text: { pt: "As etapas, sem jargão", en: "The steps, without jargon" } },
  {
    type: "list",
    ordered: true,
    items: [
      {
        pt: "DNS, a lista telefônica. O navegador pergunta qual é o endereço numérico (o IP) de matsuhub.com. Se perguntou há pouco, a resposta vem da memória e leva 0 ms.",
        en: "DNS, the phone book. The browser asks for the numeric address (the IP) of matsuhub.com. If it asked recently, the answer comes from memory and takes 0 ms.",
      },
      {
        pt: "TCP, o \"alô, está me ouvindo?\". Navegador e servidor trocam mensagens para abrir a conexão. Custa uma ida e volta.",
        en: "TCP, the \"hello, can you hear me?\". Browser and server exchange messages to open the connection. It costs one round trip.",
      },
      {
        pt: "TLS, o cadeado. Os dois combinam uma chave secreta na frente de todo mundo sem que ninguém no caminho consiga descobri-la. Daí em diante, tudo vai cifrado.",
        en: "TLS, the padlock. The two agree on a secret key in plain sight without anyone along the way being able to work it out. From then on, everything is encrypted.",
      },
      {
        pt: "Espera: o servidor trabalha. O pedido chega, a página é encontrada ou montada e o primeiro pedaço da resposta volta. Numa página pronta servida de perto, é quase só o tempo da viagem.",
        en: "Waiting: the server works. The request arrives, the page is found or built and the first bit of the response comes back. For a ready-made page served from nearby, it's mostly travel time.",
      },
      {
        pt: "Download: a resposta chega em pedaços pela rede.",
        en: "Download: the response arrives in pieces over the network.",
      },
      {
        pt: "Montagem: o navegador lê o HTML, busca estilos e scripts, monta a página e desenha. É aqui que o site aparece para você.",
        en: "Assembly: the browser reads the HTML, fetches styles and scripts, builds the page and paints it. This is when the site appears to you.",
      },
    ],
  },
  { type: "h2", text: { pt: "De onde vêm os números", en: "Where the numbers come from" } },
  {
    type: "p",
    text: {
      pt: "Do seu navegador. A Navigation Timing API (`performance.getEntriesByType(\"navigation\")`) anota o instante de cada etapa da página que você abriu, e nada disso é enviado para nós. Se você chegou aqui navegando dentro do site, os tempos são da primeira página que abriu nesta aba; recarregue para medir esta.",
      en: "From your browser. The Navigation Timing API (`performance.getEntriesByType(\"navigation\")`) records the moment of each step of the page you opened, and none of it is sent to us. If you got here by browsing within the site, the timings are from the first page you opened in this tab; reload to measure this one.",
    },
  },
  {
    type: "p",
    text: {
      pt: "A distância vem de 5 pedidos pequenos à própria página (`HEAD`, sem cache), dos quais usamos o do meio. A luz na fibra anda cerca de 200 km por milissegundo e o pedido vai e volta, então o servidor está, no máximo, a esse tempo × 100 km. Na prática está mais perto: há roteadores, filas e cabos que não seguem linha reta. Quem responde é o ponto da Vercel mais próximo de você, e o cabeçalho `x-vercel-id` diz qual (gru1 é São Paulo).",
      en: "The distance comes from 5 small requests to this very page (`HEAD`, no cache), of which we take the middle one. Light in fibre travels about 200 km per millisecond and the request goes there and back, so the server is at most that time × 100 km away. In practice it's closer: there are routers, queues and cables that don't run in straight lines. The one answering is the Vercel location nearest to you, and the `x-vercel-id` header says which (gru1 is São Paulo).",
    },
  },
  {
    type: "callout",
    text: {
      pt: "Para um negócio, isso é dinheiro: cada ida e volta custa a distância até o servidor. Servir de perto, reaproveitar conexões e mandar menos coisa é o que separa um site que abre em meio segundo de um que abre em três.",
      en: "For a business, this is money: every round trip costs the distance to the server. Serving from nearby, reusing connections and sending less is what separates a site that opens in half a second from one that takes three.",
    },
  },
];

export const NEXT_WORD: readonly LabBlock[] = [
  { type: "h2", text: { pt: "O que este modelo faz", en: "What this model does" } },
  {
    type: "p",
    text: {
      pt: "Ele lê as 32 respostas da central de ajuda do experimento de busca semântica e conta quais palavras vieram depois de cada par de palavras. Para escrever, olha as duas últimas palavras do texto, transforma as contagens em probabilidades e sorteia uma. Se aquele par nunca apareceu, olha só a última palavra.",
      en: "It reads the 32 help-center answers from the semantic search experiment and counts which words came after each pair of words. To write, it looks at the last two words of the text, turns the counts into probabilities and draws one. If that pair never came up, it looks at the last word alone.",
    },
  },
  {
    type: "list",
    items: [
      {
        pt: "Temperatura: antes do sorteio, cada contagem é elevada a 1/T. Com T baixo, a mais provável ganha quase sempre; com T alto, as raras ganham chance. Em zero, é sempre a primeira.",
        en: "Temperature: before the draw, each count is raised to 1/T. With a low T the likeliest word almost always wins; with a high T, rare ones get a chance. At zero, it's always the first.",
      },
      {
        pt: "Contexto: duas palavras são toda a memória dele. Os modelos grandes leem centenas de páginas de uma vez.",
        en: "Context: two words are its whole memory. Large models read hundreds of pages at once.",
      },
      {
        pt: "Tokens: aqui cada palavra é um token. Nos modelos grandes, tokens são pedaços de palavras, e o vocabulário tem dezenas de milhares deles.",
        en: "Tokens: here each word is a token. In large models, tokens are pieces of words, and the vocabulary has tens of thousands of them.",
      },
    ],
  },
  { type: "h2", text: { pt: "Por que a IA inventa", en: "Why AI makes things up" } },
  {
    type: "p",
    text: {
      pt: "O modelo não consulta fatos: ele continua o texto com o que costuma vir depois. Com a temperatura alta, junta pedaços de frases verdadeiras e produz uma frase fluente e falsa, como um prazo de entrega que não existe. Os modelos grandes erram bem menos, mas pelo mesmo motivo.",
      en: "The model doesn't look up facts: it continues the text with what usually comes next. With the temperature up, it stitches together pieces of true sentences into a fluent, false one, like a delivery time that doesn't exist. Large models get it wrong far less often, but for the same reason.",
    },
  },
  {
    type: "callout",
    text: {
      pt: "Por isso os agentes que construímos respondem a partir dos documentos da empresa, citam a fonte e admitem quando não sabem, como no experimento de busca semântica.",
      en: "That's why the agents we build answer from the company's own documents, cite the source and admit when they don't know, as in the semantic search experiment.",
    },
  },
  {
    type: "callout",
    text: {
      pt: "Isto é uma cadeia de Markov de palavras, não uma rede neural. O loop é o mesmo de um LLM (ler o contexto, calcular probabilidades, sortear, repetir); o que muda é como as probabilidades são calculadas.",
      en: "This is a word-level Markov chain, not a neural network. The loop is the same as an LLM's (read the context, compute probabilities, draw, repeat); what changes is how the probabilities are computed.",
    },
  },
];
