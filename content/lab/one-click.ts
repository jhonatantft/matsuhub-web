/**
 * "O que acontece em um clique" (components/lab/click): interface copy and the Vercel regions,
 * resolved per language on the server.
 */
export const CLICK_COPY = {
  aria: { pt: "Linha do tempo de como esta página chegou até você", en: "Timeline of how this page reached you" },
  loading: { pt: "Lendo os tempos do seu navegador…", en: "Reading your browser's timings…" },
  unsupported: { pt: "Seu navegador não informou os tempos desta página.", en: "Your browser didn't report this page's timings." },
  total: { pt: "Esta página abriu em", en: "This page opened in" },
  measured: { pt: "medido pelo seu navegador · nada sai daqui", en: "measured by your browser · nothing leaves it" },
  earlier: {
    pt: "Você chegou navegando pelo site: estes são os tempos da primeira página que abriu nesta aba. Recarregue para medir esta.",
    en: "You got here by browsing the site: these are the timings of the first page you opened in this tab. Reload to measure this one.",
  },
  reload: { pt: "Medir de novo", en: "Measure again" },
  replay: { pt: "Rever em câmera lenta", en: "Replay in slow motion" },
  slow: { pt: "câmera lenta {x}×", en: "slow motion {x}×" },
  protocol: { pt: "protocolo {p}", en: "protocol {p}" },
  zero: { pt: "0 ms: já estava pronto", en: "0 ms: already done" },
  phases: {
    prep: {
      name: { pt: "Antes da rede", en: "Before the network" },
      short: { pt: "confere a memória", en: "checks its memory" },
      long: {
        pt: "Antes de sair para a internet, o navegador confere se já tem algo guardado, segue redirecionamentos e se prepara.",
        en: "Before going out to the internet, the browser checks what it already has stored, follows redirects and gets ready.",
      },
    },
    dns: {
      name: { pt: "DNS", en: "DNS" },
      short: { pt: "a lista telefônica", en: "the phone book" },
      long: {
        pt: "Pergunta qual é o endereço numérico (o IP) do site. Se a resposta já estava na memória, leva 0 ms.",
        en: "Asks for the site's numeric address (the IP). If the answer was already in memory, it takes 0 ms.",
      },
    },
    tcp: {
      name: { pt: "Conexão", en: "Connection" },
      short: { pt: "\"alô, está me ouvindo?\"", en: "\"hello, can you hear me?\"" },
      long: {
        pt: "Navegador e servidor trocam mensagens para abrir um canal. Custa uma ida e volta inteira.",
        en: "Browser and server exchange messages to open a channel. It costs a full round trip.",
      },
    },
    tls: {
      name: { pt: "Cadeado", en: "Padlock" },
      short: { pt: "combinar um segredo", en: "agreeing on a secret" },
      long: {
        pt: "Os dois combinam uma chave secreta em público sem que ninguém no caminho consiga descobri-la. Daí em diante, tudo vai cifrado.",
        en: "The two agree on a secret key in public without anyone along the way being able to work it out. From then on, everything is encrypted.",
      },
    },
    wait: {
      name: { pt: "Servidor", en: "Server" },
      short: { pt: "a cozinha preparando", en: "the kitchen cooking" },
      long: {
        pt: "O pedido chega, a página é encontrada e o primeiro pedaço da resposta volta. Esta já estava pronta, guardada perto de você.",
        en: "The request arrives, the page is found and the first bit of the response comes back. This one was ready, stored near you.",
      },
    },
    download: {
      name: { pt: "Download", en: "Download" },
      short: { pt: "a entrega", en: "the delivery" },
      long: { pt: "A resposta chega em pedaços pela rede.", en: "The response arrives in pieces over the network." },
    },
    build: {
      name: { pt: "Montagem", en: "Assembly" },
      short: { pt: "montar o móvel", en: "assembling the furniture" },
      long: {
        pt: "O navegador lê o HTML, busca estilos e scripts e monta a página. É quando o site aparece para você.",
        en: "The browser reads the HTML, fetches styles and scripts and builds the page. That's when the site appears to you.",
      },
    },
    rest: {
      name: { pt: "O resto", en: "The rest" },
      short: { pt: "imagens e detalhes", en: "images and details" },
      long: {
        pt: "Imagens, fontes e o que mais a página pediu terminam de chegar.",
        en: "Images, fonts and whatever else the page asked for finish arriving.",
      },
    },
  },
  distance: {
    title: { pt: "Até onde o seu pedido foi", en: "How far your request went" },
    lead: {
      pt: "Mede 5 vezes a ida e volta até o servidor que te atende e usa a do meio.",
      en: "Measures the round trip to the server answering you 5 times and keeps the middle one.",
    },
    start: { pt: "Medir agora", en: "Measure now" },
    measuring: { pt: "Medindo…", en: "Measuring…" },
    again: { pt: "Medir de novo", en: "Measure again" },
    rtt: { pt: "ida e volta", en: "round trip" },
    servedFrom: { pt: "Quem te atendeu", en: "Who answered you" },
    local: { pt: "este computador (desenvolvimento)", en: "this computer (development)" },
    unknownRegion: { pt: "um servidor da Vercel", en: "a Vercel server" },
    maxKm: { pt: "Ele está, no máximo, a {km} de você.", en: "It's at most {km} away from you." },
    light: {
      pt: "A luz na fibra anda uns 200 km por milissegundo. Em {ms} de ida e volta, ela vai até {half} e volta.",
      en: "Light in fibre travels about 200 km per millisecond. In a {ms} round trip, it goes {half} out and back.",
    },
    you: { pt: "Você", en: "You" },
    server: { pt: "Servidor", en: "Server" },
    error: { pt: "Não deu para medir agora. Tente de novo.", en: "Couldn't measure right now. Try again." },
  },
  regions: {
    arn: { pt: "Estocolmo", en: "Stockholm" },
    bom: { pt: "Mumbai", en: "Mumbai" },
    cdg: { pt: "Paris", en: "Paris" },
    cle: { pt: "Cleveland", en: "Cleveland" },
    cpt: { pt: "Cidade do Cabo", en: "Cape Town" },
    dub: { pt: "Dublin", en: "Dublin" },
    dxb: { pt: "Dubai", en: "Dubai" },
    fra: { pt: "Frankfurt", en: "Frankfurt" },
    gru: { pt: "São Paulo", en: "São Paulo" },
    hkg: { pt: "Hong Kong", en: "Hong Kong" },
    hnd: { pt: "Tóquio", en: "Tokyo" },
    iad: { pt: "Washington, D.C.", en: "Washington, D.C." },
    icn: { pt: "Seul", en: "Seoul" },
    kix: { pt: "Osaka", en: "Osaka" },
    lhr: { pt: "Londres", en: "London" },
    pdx: { pt: "Portland", en: "Portland" },
    sfo: { pt: "São Francisco", en: "San Francisco" },
    sin: { pt: "Singapura", en: "Singapore" },
    syd: { pt: "Sydney", en: "Sydney" },
    yul: { pt: "Montreal", en: "Montréal" },
  },
} as const;
