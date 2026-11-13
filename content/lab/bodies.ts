import { NEXT_WORD, ONE_CLICK, PASSWORD } from "./explainer-bodies";
import type { LabBlock, LabId } from "./index";

/**
 * Article text of every Lab page: the two technical notes, and the "how it works" section under
 * each experiment. Server-only (imported by components/lab/LabItemPage). Code is shared by both
 * languages. Every claim here describes code that exists in this repository — keep it that way.
 */

const LOAD_TEST: readonly LabBlock[] = [
  { type: "h2", text: { pt: "O que o modelo assume", en: "What the model assumes" } },
  {
    type: "list",
    items: [
      {
        pt: "Cada pessoa ativa abre uma página a cada 20 segundos. Cada página faz 1 requisição dinâmica (HTML ou API) e busca 8 arquivos estáticos (imagens, CSS, JavaScript).",
        en: "Each active person opens a page every 20 seconds. Each page makes 1 dynamic request (HTML or API) and fetches 8 static files (images, CSS, JavaScript).",
      },
      {
        pt: "Uma requisição dinâmica gasta 40 ms de processador e faz 4 consultas ao banco, de 3 ms cada. Um arquivo estático gasta 2 ms.",
        en: "A dynamic request takes 40 ms of CPU and runs 4 database queries of 3 ms each. A static file takes 2 ms.",
      },
      {
        pt: "Servidor único: uma máquina de 4 núcleos roda a aplicação, o banco e os arquivos estáticos.",
        en: "Single server: one 4-core machine runs the application, the database and the static files.",
      },
      {
        pt: "Arquitetura escalável: a CDN entrega 95% dos estáticos; máquinas de 2 núcleos ligam e desligam para ficar perto de 50% de uso (mínimo 2, máximo 48); um cache responde 70% das leituras; o banco principal recebe as escritas e até 3 réplicas dividem as leituras.",
        en: "Scalable architecture: the CDN serves 95% of static files; 2-core machines switch on and off to stay near 50% usage (minimum 2, maximum 48); a cache answers 70% of reads; the primary database takes the writes and up to 3 replicas share the reads.",
      },
      {
        pt: "Tempo de resposta: cada máquina é uma fila M/M/1. O tempo médio é o tempo de serviço dividido por (1 − uso), e o p95 fica em cerca de 3 vezes a média. Somamos 60 ms de rede.",
        en: "Response time: each machine is an M/M/1 queue. Mean time is service time divided by (1 − usage), and p95 is about 3 times the mean. We add 60 ms of network.",
      },
      {
        pt: "Acima de 100% de uso, a fila cresce sem parar: a parte das requisições que não cabe vira erro por tempo esgotado.",
        en: "Above 100% usage the queue grows without bound: the share of requests that doesn't fit becomes a timeout error.",
      },
    ],
  },
  {
    type: "callout",
    text: {
      pt: "Os números são suposições de um sistema típico, não medições de um sistema real. Servem para comparar as duas arquiteturas, não para dimensionar o seu sistema: para isso, o certo é medir com um teste de carga de verdade.",
      en: "These numbers are assumptions about a typical system, not measurements of a real one. They are for comparing the two architectures, not for sizing your system: for that, the right move is to measure with a real load test.",
    },
  },
  { type: "h2", text: { pt: "Por que isso importa", en: "Why it matters" } },
  {
    type: "p",
    text: {
      pt: "Um post que viraliza ou uma Black Friday multiplicam o acesso em minutos. Se o sistema não escala, ele cai justo no dia em que mais venderia. E escalar não quer dizer pagar caro o ano inteiro: as máquinas ligam no pico e desligam depois, e o painel mostra quantas estão ligadas em cada momento.",
      en: "A post that goes viral or a Black Friday multiplies traffic in minutes. If the system doesn't scale, it goes down on the very day it would sell the most. And scaling doesn't mean paying a lot all year: machines switch on for the peak and off afterwards, and the panel shows how many are running at each moment.",
    },
  },
  {
    type: "p",
    text: {
      pt: "Tudo roda no seu navegador: o modelo é uma função pura em TypeScript (`pose(pessoas, arquitetura)`), e a cena 3D, os números e o gráfico leem dela a cada quadro. Por isso eles nunca se desencontram.",
      en: "Everything runs in your browser: the model is a pure TypeScript function (`pose(people, architecture)`), and the 3D scene, the numbers and the chart read from it every frame. That's why they never disagree.",
    },
  },
];

const SEMANTIC_SEARCH: readonly LabBlock[] = [
  { type: "h2", text: { pt: "O que acontece em cada etapa", en: "What happens at each step" } },
  {
    type: "list",
    ordered: true,
    items: [
      {
        pt: "Indexação, uma vez só: cada trecho da central de ajuda vira um vetor. Aqui usamos TF-IDF de trigramas, pedaços de 3 letras de cada palavra, pesados por quão raros são na base.",
        en: "Indexing, done once: each help-center passage becomes a vector. Here we use TF-IDF over trigrams, 3-letter pieces of each word, weighted by how rare they are in the base.",
      },
      {
        pt: "Mapa 3D: os vetores têm mais de mil dimensões. Para desenhar, projetamos em 3 com PCA, as três direções em que os trechos mais variam. Trechos do mesmo assunto ficam perto uns dos outros.",
        en: "3D map: the vectors have over a thousand dimensions. To draw them we project onto 3 with PCA, the three directions in which the passages vary most. Passages on the same topic end up close together.",
      },
      {
        pt: "Pergunta: passa pelo mesmo processo e vira um vetor no mesmo espaço.",
        en: "Question: goes through the same process and becomes a vector in the same space.",
      },
      {
        pt: "Busca: medimos a semelhança (cosseno) com todos os trechos e ficamos com os 3 mais parecidos. A distância no desenho é aproximada; a busca usa o vetor inteiro.",
        en: "Search: we measure similarity (cosine) against every passage and keep the 3 closest. Distance in the drawing is approximate; the search uses the full vector.",
      },
      {
        pt: "Resposta: um agente de verdade entrega esses trechos a um modelo de linguagem, que escreve a resposta e cita a fonte. Aqui mostramos o trecho mais relevante como resposta.",
        en: "Answer: a real agent hands those passages to a language model, which writes the answer and cites the source. Here we show the most relevant passage as the answer.",
      },
    ],
  },
  {
    type: "callout",
    text: {
      pt: "Se nenhum trecho passa de um mínimo de semelhança, o certo é dizer que não sabe e chamar uma pessoa. É isso que impede o agente de inventar resposta.",
      en: "If no passage clears a minimum similarity, the right move is to say it doesn't know and hand over to a person. That's what stops the agent from making answers up.",
    },
  },
  { type: "h2", text: { pt: "A diferença para um sistema de produção", en: "How this differs from a production system" } },
  {
    type: "p",
    text: {
      pt: "TF-IDF só reconhece palavras parecidas: “prazo de entrega” e “quanto tempo demora para chegar” não se encontram. Um sistema de produção usa embeddings de um modelo de linguagem, que entendem sinônimos e paráfrases, guardados num banco vetorial. O caminho é o mesmo que você viu aqui: vetor, vizinhos, resposta com fonte.",
      en: "TF-IDF only recognizes similar words: “delivery time” and “how long until it arrives” don't meet. A production system uses embeddings from a language model, which understand synonyms and paraphrases, stored in a vector database. The path is the same one you saw here: vector, neighbours, answer with a source.",
    },
  },
  {
    type: "p",
    text: {
      pt: "Tudo roda no seu navegador. Nada do que você digita sai daqui.",
      en: "Everything runs in your browser. Nothing you type leaves this page.",
    },
  },
];

const ONE_LOOP: readonly LabBlock[] = [
  {
    type: "p",
    text: {
      pt: "Este site tem muita coisa se mexendo ao mesmo tempo: o diagrama da página inicial, os pacotes de dados no mapa de arquitetura, as cenas 3D do Lab. O caminho óbvio é cada componente chamar `requestAnimationFrame` por conta própria. Funciona, até parar de funcionar.",
      en: "This site has a lot moving at once: the homepage diagram, the data packets on the architecture map, the Lab's 3D scenes. The obvious route is for each component to call `requestAnimationFrame` on its own. It works, until it doesn't.",
    },
  },
  { type: "h2", text: { pt: "O problema", en: "The problem" } },
  {
    type: "p",
    text: {
      pt: "Cada loop independente acorda a cada quadro, mesmo quando o componente está fora da tela. Com vinte deles, o navegador faz vinte agendamentos por quadro, o celular esquenta e a bateria vai embora. E não existe um lugar só para pausar tudo, nem para congelar o tempo e conferir um quadro específico.",
      en: "Each independent loop wakes up every frame, even when its component is off screen. With twenty of them, the browser schedules twenty callbacks per frame, the phone heats up and the battery drains. And there's no single place to pause everything, or to freeze time and check one specific frame.",
    },
  },
  { type: "h2", text: { pt: "Um relógio, muitos ouvintes", en: "One clock, many listeners" } },
  {
    type: "p",
    text: {
      pt: "Aqui existe um loop só, em `lib/ticker.ts`. Quem quer animar se inscreve e recebe o tempo e o intervalo desde o último quadro. Quando o último ouvinte sai, o loop para.",
      en: "Here there's a single loop, in `lib/ticker.ts`. Anything that wants to animate subscribes and receives the time and the interval since the last frame. When the last listener leaves, the loop stops.",
    },
  },
  {
    type: "code",
    caption: { pt: "lib/ticker.ts, resumido", en: "lib/ticker.ts, abridged" },
    code: `const subs = new Set<FrameFn>();
let raf = 0;
let last = 0;

function loop(ms: number) {
  raf = requestAnimationFrame(loop);
  const now = ms / 1000;
  const forced = labParam("t"); // ?t=3.2 freezes time
  const dt = forced !== null ? 1 : last ? Math.min(0.05, now - last) : 1 / 60;
  last = now;
  for (const fn of subs) fn(forced ?? now, dt);
}

export function onFrame(fn: FrameFn): () => void {
  subs.add(fn);
  if (subs.size === 1) {
    last = 0;
    raf = requestAnimationFrame(loop);
  }
  return () => {
    subs.delete(fn);
    if (subs.size === 0) cancelAnimationFrame(raf);
  };
}`,
  },
  {
    type: "p",
    text: {
      pt: "O intervalo é limitado a 50 ms. Se a aba fica em segundo plano e volta, nenhuma animação dá um salto gigante.",
      en: "The interval is capped at 50 ms. If the tab goes to the background and comes back, no animation takes a giant leap.",
    },
  },
  { type: "h2", text: { pt: "Congelar o tempo", en: "Freezing time" } },
  {
    type: "p",
    text: {
      pt: "Como todo mundo lê o mesmo relógio, dá para trocá-lo. Com `?t=3.2` na URL, o tempo para em 3,2 segundos para todos os componentes de uma vez. É assim que tiramos capturas idênticas de cada estado da página num Chrome sem interface e comparamos uma versão com a outra.",
      en: "Since everything reads the same clock, the clock can be swapped. With `?t=3.2` in the URL, time stops at 3.2 seconds for every component at once. That's how we take identical captures of each page state in a headless Chrome and compare one version with the next.",
    },
  },
  {
    type: "callout",
    text: {
      pt: "A regra que isso impõe: o estado de uma animação sai do tempo, não da soma de intervalos. Quem acumula `dt` não consegue reproduzir um quadro congelado.",
      en: "The rule this imposes: an animation's state comes from the time, not from a running sum of intervals. Whatever accumulates `dt` can't reproduce a frozen frame.",
    },
  },
  { type: "h2", text: { pt: "Só anima o que está na tela", en: "Only animate what's on screen" } },
  {
    type: "p",
    text: {
      pt: "As cenas se inscrevem no relógio quando entram na tela e saem quando deixam de ser vistas, com um `IntersectionObserver`. As cenas 3D também param quando a aba perde o foco.",
      en: "Scenes subscribe to the clock when they come on screen and leave when they're no longer visible, using an `IntersectionObserver`. The 3D scenes also stop when the tab loses focus.",
    },
  },
  {
    type: "code",
    code: `useEffect(() => {
  let stop: (() => void) | null = null;
  const io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !stop) stop = onFrame(draw);
    else if (!entry.isIntersecting && stop) {
      stop();
      stop = null;
    }
  });
  io.observe(el);
  return () => {
    io.disconnect();
    stop?.();
  };
}, []);`,
  },
  { type: "h2", text: { pt: "Medir uma vez, mexer só no transform", en: "Measure once, touch only transform" } },
  {
    type: "p",
    text: {
      pt: "No mapa de arquitetura da página Sob medida, pacotes de dados percorrem curvas SVG. Pedir ao navegador a posição na curva a cada quadro (`getPointAtLength`) é caro. Então amostramos cada curva uma vez, guardamos os pontos num `Float32Array` e, a cada quadro, só interpolamos entre dois pontos e mudamos o `transform`. O loop não mede layout: só faz contas e muda um atributo.",
      en: "On the Custom builds page's architecture map, data packets travel along SVG curves. Asking the browser for a position on the curve every frame (`getPointAtLength`) is expensive. So we sample each curve once, keep the points in a `Float32Array` and, every frame, just interpolate between two points and change the `transform`. The loop never measures layout: it does arithmetic and sets one attribute.",
    },
  },
  {
    type: "code",
    code: `// once, after mount
const pts = new Float32Array((STEPS + 1) * 2);
const len = path.getTotalLength();
for (let i = 0; i <= STEPS; i++) {
  const p = path.getPointAtLength((i / STEPS) * len);
  pts[i * 2] = p.x;
  pts[i * 2 + 1] = p.y;
}

// every frame
const f = progress * STEPS;
const i = Math.min(STEPS - 1, Math.floor(f));
const k = f - i;
const x = pts[i * 2] + (pts[i * 2 + 2] - pts[i * 2]) * k;
const y = pts[i * 2 + 1] + (pts[i * 2 + 3] - pts[i * 2 + 1]) * k;
dot.setAttribute("transform", \`translate(\${x} \${y})\`);`,
  },
  { type: "h2", text: { pt: "E para quem prefere menos movimento", en: "And for people who prefer less motion" } },
  {
    type: "p",
    text: {
      pt: "Com `prefers-reduced-motion` ligado, nada toca sozinho: sem loops automáticos e sem paralaxe. As cenas continuam respondendo ao que a pessoa faz, só que cortam em vez de deslizar.",
      en: "With `prefers-reduced-motion` on, nothing plays by itself: no automatic loops and no parallax. Scenes still respond to what the person does; they just cut instead of gliding.",
    },
  },
  { type: "h2", text: { pt: "O que se ganha", en: "What you get" } },
  {
    type: "list",
    items: [
      { pt: "Um lugar só para pausar, testar e medir todas as animações.", en: "One place to pause, test and measure every animation." },
      { pt: "Nada roda fora da tela, então página longa não pesa mais que página curta.", en: "Nothing runs off screen, so a long page costs no more than a short one." },
      { pt: "Quadros reproduzíveis: a mesma URL com `?t=` dá sempre a mesma imagem.", en: "Reproducible frames: the same URL with `?t=` always gives the same image." },
    ],
  },
];

const PUBLIC_FORMS: readonly LabBlock[] = [
  {
    type: "p",
    text: {
      pt: "Todo site tem um formulário de contato, e todo formulário aberto vira alvo de robô. A resposta comum é o CAPTCHA, que também castiga quem é gente. Aqui montamos camadas que o visitante não vê: cada uma barra um tipo de abuso, e juntas seguram o grosso sem pedir para ninguém clicar em semáforos.",
      en: "Every site has a contact form, and every open form becomes a bot target. The usual answer is a CAPTCHA, which punishes humans too. Here we built layers the visitor never sees: each one stops one kind of abuse, and together they hold back the bulk without asking anyone to click on traffic lights.",
    },
  },
  { type: "h2", text: { pt: "1. Antes de rodar qualquer código", en: "1. Before any code runs" } },
  {
    type: "p",
    text: {
      pt: "A primeira camada deve ficar na borda, no firewall da hospedagem: uma regra de limite por IP corta enxurradas antes de qualquer função ser executada. Requisição barrada ali não custa processamento.",
      en: "The first layer belongs at the edge, in the host's firewall: a per-IP rate rule cuts floods before any function runs. A request stopped there costs no compute.",
    },
  },
  { type: "h2", text: { pt: "2. É o nosso site mesmo?", en: "2. Is it really our site?" } },
  {
    type: "p",
    text: {
      pt: "O endpoint só aceita JSON, com tamanho máximo, vindo da nossa origem. Navegadores mandam os cabeçalhos `Origin` e `Sec-Fetch-Site`; um envio vindo de outro site é recusado.",
      en: "The endpoint only accepts JSON, with a size cap, coming from our own origin. Browsers send the `Origin` and `Sec-Fetch-Site` headers; a submission coming from another site is refused.",
    },
  },
  { type: "h2", text: { pt: "3. Limite por IP, com janela deslizante", en: "3. Per-IP limits with a sliding window" } },
  {
    type: "p",
    text: {
      pt: "Contamos envios por IP em janelas de tempo. Uma janela fixa tem um defeito: quem manda tudo no fim de uma janela e no começo da outra passa o dobro do limite. A janela deslizante soma a janela atual com uma parte da anterior, proporcional ao tempo que falta.",
      en: "We count submissions per IP in time windows. A fixed window has a flaw: whoever sends everything at the end of one window and the start of the next gets twice the limit. A sliding window adds the current window to a share of the previous one, proportional to the time remaining.",
    },
  },
  {
    type: "code",
    code: `const into = (now % WINDOW) / WINDOW; // 0..1 into the current window
const estimate = current + previous * (1 - into);
if (estimate >= LIMIT) return { ok: false, retryAfter };`,
  },
  {
    type: "list",
    items: [
      {
        pt: "Pedidos recusados também contam, então quem insiste continua barrado.",
        en: "Rejected requests count too, so whoever keeps hammering stays blocked.",
      },
      {
        pt: "IPv6 é contado por prefixo /64, porque um cliente de provedor costuma ter o bloco inteiro.",
        en: "IPv6 is counted per /64 prefix, because one ISP customer usually owns the whole block.",
      },
      {
        pt: "Com um Redis configurado, todas as instâncias do servidor dividem os mesmos contadores; sem ele, cada uma conta na própria memória.",
        en: "With a Redis configured, every server instance shares the same counters; without it, each one counts in its own memory.",
      },
      {
        pt: "Se o Redis cai, o visitante passa. Uma pane nossa nunca pode bloquear um cliente.",
        en: "If Redis goes down, the visitor gets through. An outage on our side must never block a customer.",
      },
    ],
  },
  { type: "h2", text: { pt: "4. Armadilhas que ninguém vê", en: "4. Traps nobody sees" } },
  {
    type: "list",
    items: [
      {
        pt: "Pote de mel: um campo escondido que pessoas não enxergam e robôs preenchem.",
        en: "Honeypot: a hidden field people never see and bots fill in.",
      },
      {
        pt: "Tempo de preenchimento: o relógio começa quando o formulário aparece na tela. Ninguém digita nome e contato em poucos segundos.",
        en: "Time to fill: the clock starts when the form appears on screen. Nobody types a name and contact details in a couple of seconds.",
      },
      {
        pt: "Conteúdo: links demais, link no campo de nome ou o mesmo texto repetido várias vezes.",
        en: "Content: too many links, a link in the name field, or the same text repeated over and over.",
      },
      {
        pt: "Duplicado: o mesmo contato com a mesma mensagem, em poucos minutos, entra uma vez só.",
        en: "Duplicates: the same contact with the same message within a few minutes gets in only once.",
      },
    ],
  },
  {
    type: "callout",
    text: {
      pt: "O pulo do gato: o robô barrado por essas armadilhas recebe a mesma resposta de sucesso que uma pessoa. Ele não sabe que foi filtrado, então não aprende a contornar.",
      en: "The trick: a bot caught by these traps gets the same success response as a person. It never learns it was filtered, so it never learns to get around it.",
    },
  },
  { type: "h2", text: { pt: "5. O IP nunca é guardado", en: "5. The IP is never stored" } },
  {
    type: "p",
    text: {
      pt: "Para contar envios por IP, não precisamos saber qual é o IP. Os contadores, o banco e os logs usam um HMAC do endereço com uma chave secreta: dá para comparar, não dá para voltar ao IP. Os logs mostram só os primeiros caracteres. É um dado pessoal a menos para proteger, o que facilita a vida com a LGPD.",
      en: "To count submissions per IP we don't need to know the IP. Counters, the database and logs use an HMAC of the address with a secret key: comparable, but not reversible. Logs show only the first few characters. That's one less piece of personal data to protect, which makes privacy compliance easier.",
    },
  },
  {
    type: "code",
    code: `import { createHmac } from "node:crypto";

const ipTag = (ip: string) =>
  createHmac("sha256", process.env.IP_HASH_SECRET!).update(ip).digest("hex");`,
  },
  { type: "h2", text: { pt: "Quando usar CAPTCHA mesmo assim", en: "When a CAPTCHA still makes sense" } },
  {
    type: "p",
    text: {
      pt: "Se o formulário dispara algo caro, como SMS, chamada de IA ou criação de conta, uma checagem extra pode valer a pena. Para contato e orçamento, as camadas acima seguram o grosso sem atrapalhar ninguém.",
      en: "If the form triggers something expensive, like an SMS, an AI call or account creation, an extra check may be worth it. For contact and quote forms, the layers above hold back the bulk without getting in anyone's way.",
    },
  },
];

export const LAB_BODIES: Record<LabId, readonly LabBlock[]> = {
  password: PASSWORD,
  "one-click": ONE_CLICK,
  "next-word": NEXT_WORD,
  "load-test": LOAD_TEST,
  "semantic-search": SEMANTIC_SEARCH,
  "one-loop": ONE_LOOP,
  "public-forms": PUBLIC_FORMS,
};
