/**
 * "Quanto tempo levam para quebrar a sua senha?" (components/lab/password): interface copy, the
 * passwords attackers try first and the passphrase word lists. Resolved per language on the server.
 */

/** Lowercase. Real lists have millions of entries; these are the classics in Brazil and abroad. */
export const COMMON_PASSWORDS: readonly string[] = [
  "123456", "123456789", "12345678", "12345", "1234567", "1234567890", "123123", "111111", "000000", "654321",
  "102030", "121212", "123321", "159753", "147258369", "7777777", "888888", "999999", "aaaaaa", "senha",
  "senha123", "password", "password1", "qwerty", "qwerty123", "abc123", "abcd1234", "iloveyou", "admin", "admin123",
  "welcome", "letmein", "monkey", "dragon", "football", "futebol", "flamengo", "corinthians", "palmeiras", "saopaulo",
  "vasco", "gremio", "cruzeiro", "santos", "brasil", "brazil", "amor", "teamo", "deus", "jesus",
  "familia", "felicidade", "princesa", "princess", "sunshine", "master", "shadow", "superman", "batman", "pokemon",
  "minecraft", "liverpool", "arsenal", "chelsea", "matrix", "trustno1", "starwars", "hello", "freedom", "whatever",
  "charlie", "michael", "jessica", "daniel", "gabriel", "lucas", "mariana", "beatriz", "love", "secret",
  "login", "asdfgh", "zxcvbn", "1q2w3e4r", "1q2w3e", "q1w2e3r4", "mudar123", "trocar123", "acesso", "bemvindo",
];

/** Other words people build passwords from (on top of the lists above and the passphrase words). */
export const COMMON_WORDS: readonly string[] = [
  "forte", "segura", "secreta", "nova", "vida", "mae", "pai", "filho", "filha", "bebe", "linda", "lindo", "anjo", "feliz",
  "minha", "meu", "nossa", "super", "mega", "cachorro", "flor", "beijo", "sorte", "paz", "fe", "jesus", "maria", "joao",
  "pedro", "ana", "jose", "brasil", "time", "correct", "battery", "staple", "horse", "strong", "secure", "my", "life",
  "baby", "angel", "lucky", "happy", "summer", "winter", "blue", "red", "green", "black", "azul", "verde", "preto",
];

const PT_WORDS =
  "abacate abelha agulha alface amora anel areia arroz balde banana banco barco batata bigode bola bolo bota brisa burro cabra cacto caderno caju calor cama camelo caneca caneta canoa carro casa castelo cavalo cebola cenoura cereja chave chuva cinema cobra coelho cometa copo coruja corda coroa dado dente doce dedo escada espada espelho estrela faca farol fada festa figo floresta flauta foca fogo folha formiga foguete fruta funil gaita galinha galo garfo garrafa gato gelo girafa gota grama grilo guitarra horta ilha janela jarra joia lagoa lama lanterna laranja leite leque livro lobo lua luva macaco manga mapa mar martelo mel melancia mesa milho mochila moeda montanha morango mosca nariz navio neve ninho noite nuvem onda ostra ovelha ovo palha panela papel pato pedra peixe pena pera peteca piano pipa pipoca pirata planeta pneu polvo ponte porta praia prato pulga queijo raio raposa rato rede remo rio roda rosa sapato sapo selo serra sino sol sopa tambor tapete tatu teclado telhado tesoura tigre tijolo toalha tomate touro trem trigo tucano tulipa urso uva vaca vela vento vidro violino zebra abacaxi alho ameixa baleia barraca bambu bandeira bengala boneca cadeira caixa camisa canela caracol cartola cesta chinelo colher concha cortina coxinha cupim elefante esquilo farinha fivela garoa gaveta golfinho gorila iate jabuti jaguar jangada lagarto lesma lontra mamute marreco medalha miojo moinho morcego novelo oceano pantera papagaio pastel pelicano pente pinguim pincel planta quiabo rabanete regador sabonete salsicha sanfona serpente sorvete tamanco tartaruga telefone tomada torrada trator trombone turbante vassoura veado vitrola xadrez zabumba iogurte jipe kiwi";

const EN_WORDS =
  "apple arrow badge bagel bamboo banjo barrel basket beach beacon bean bear beaver bell bench berry bicycle bison blanket boat bonfire bottle bread brick bridge broom bubble bucket butter cabin cactus camel camera candle canoe canyon carpet carrot castle cello chair cheese cherry chess cloud clover coconut comet compass cookie coral cotton crayon cricket crown cupcake curtain daisy desert dolphin donkey dragon drum eagle engine falcon feather fern ferry fiddle flame flute forest fossil fountain fox frog garden garlic giraffe glacier glove goat goose gorilla grape guitar hammer harbor harp hedgehog helmet honey horse igloo island jacket jaguar jelly kettle kite koala ladder lagoon lantern lemon lettuce lighthouse lily lion lizard lobster magnet mango maple marble meadow melon mirror mitten monkey moon moose mountain muffin napkin needle nest ocean octopus olive onion orange orchid otter owl oyster paddle palm panda parrot peach peanut pebble pelican pencil penguin pepper piano pickle pigeon pillow pine pirate pizza planet plum pocket pond popcorn potato puddle pumpkin puppet quilt rabbit raccoon radio rainbow raven ribbon river robot rocket rose saddle salmon sandal saturn scarf seal shark sheep shell shovel skate sled sloth snail socks spider spoon squid squirrel star stone storm sugar sunset swan table teapot tiger toast tomato torch tower tractor trumpet tulip tunnel turtle umbrella valley velvet violin volcano waffle wagon walnut walrus whale wheel whistle willow window wizard wolf yogurt zebra acorn anchor avocado balloon beetle biscuit blossom boulder bramble buffalo butterfly cabbage caramel cashew cattle cedar cobra crab crane dune emerald firefly flamingo galaxy gecko ginger harvest hazel iceberg jasmine kayak lemur llama lotus mammoth meteor mushroom narwhal nutmeg orbit pancake papaya puffin rhubarb";

const words = (list: string) => Array.from(new Set(list.split(" ")));
/** Passphrase word lists (no accents, so they are easy to type on any keyboard). */
export const PASSPHRASE_WORDS = { pt: words(PT_WORDS), en: words(EN_WORDS) };

export const PASSWORD_COPY = {
  aria: { pt: "Medidor de senha e gerador de senhas", en: "Password meter and password generator" },
  inputLabel: { pt: "Digite uma senha para testar", en: "Type a password to test" },
  placeholder: { pt: "ex.: Flamengo2024", en: "e.g. Liverpool2024" },
  privacy: { pt: "Fica só no seu navegador: nada é enviado nem guardado.", en: "Stays in your browser: nothing is sent or stored." },
  show: { pt: "Mostrar", en: "Show" },
  hide: { pt: "Ocultar", en: "Hide" },
  examples: { pt: "Ou teste um exemplo", en: "Or try an example" },
  presets: {
    pt: ["123456", "Flamengo2024", "S3nh@F0rte!", "cavalo-azul-grampo-correto-lua"],
    en: ["123456", "Liverpool2024", "P@ssw0rd!", "correct-horse-battery-staple-moon"],
  },
  charsTitle: { pt: "Cada caractere multiplica as possibilidades", en: "Every character multiplies the possibilities" },
  classes: {
    lower: { pt: "minúsculas", en: "lowercase" },
    upper: { pt: "maiúsculas", en: "uppercase" },
    digit: { pt: "números", en: "digits" },
    symbol: { pt: "símbolos", en: "symbols" },
    other: { pt: "acentos e outros", en: "accents and others" },
  },
  pool: { pt: "{pool} opções por caractere × {len} caracteres", en: "{pool} options per character × {len} characters" },
  brute: { pt: "Força bruta: testar tudo", en: "Brute force: try everything" },
  realistic: { pt: "Estimativa realista", en: "Realistic estimate" },
  realisticWhy: {
    pt: "Ninguém testa tudo na ordem. O atacante começa pelos padrões que as pessoas usam.",
    en: "Nobody tries everything in order. Attackers start with the patterns people actually use.",
  },
  guesses: { pt: "tentativas", en: "guesses" },
  bits: { pt: "{bits} bits", en: "{bits} bits" },
  timeTitle: { pt: "Quanto tempo leva, em média", en: "How long it takes, on average" },
  attacks: {
    online: { name: { pt: "Alguém tentando no site", en: "Someone trying on the website" }, detail: { pt: "com limite de 100 tentativas por hora", en: "capped at 100 attempts per hour" } },
    bcrypt: { name: { pt: "Vazou, guardada com bcrypt", en: "Leaked, stored with bcrypt" }, detail: { pt: "1 placa de vídeo · ~1.500 por segundo", en: "1 graphics card · ~1,500 per second" } },
    md5: { name: { pt: "Vazou, guardada com MD5", en: "Leaked, stored with MD5" }, detail: { pt: "1 placa de vídeo · ~100 bilhões por segundo", en: "1 graphics card · ~100 billion per second" } },
  },
  ticks: {
    pt: ["1 segundo", "1 dia", "1 ano", "mil anos", "idade do universo"],
    en: ["1 second", "1 day", "1 year", "1,000 years", "age of the universe"],
  },
  time: {
    instant: { pt: "na hora", en: "instantly" },
    universe: { pt: "mais que a idade do universo", en: "longer than the age of the universe" },
    /** [singular, plural]; plural takes {n}. */
    units: {
      pt: [["1 segundo", "{n} segundos"], ["1 minuto", "{n} minutos"], ["1 hora", "{n} horas"], ["1 dia", "{n} dias"], ["1 mês", "{n} meses"], ["1 ano", "{n} anos"], ["mil anos", "{n} mil anos"], ["1 milhão de anos", "{n} milhões de anos"], ["1 bilhão de anos", "{n} bilhões de anos"]],
      en: [["1 second", "{n} seconds"], ["1 minute", "{n} minutes"], ["1 hour", "{n} hours"], ["1 day", "{n} days"], ["1 month", "{n} months"], ["1 year", "{n} years"], ["1,000 years", "{n} thousand years"], ["1 million years", "{n} million years"], ["1 billion years", "{n} billion years"]],
    },
  },
  findingsTitle: { pt: "O que um atacante testa primeiro", en: "What an attacker tries first" },
  findings: {
    empty: { pt: "Digite algo acima para ver a análise.", en: "Type something above to see the analysis." },
    common: { pt: "Está entre as senhas mais usadas do mundo. É das primeiras da lista.", en: "It's one of the most used passwords in the world. It's near the top of every list." },
    word: { pt: "É uma palavra conhecida com enfeites. Programas testam dicionários inteiros com essas variações.", en: "It's a known word with decorations. Tools try whole dictionaries with those variations." },
    leet: { pt: "Trocar letras por símbolos (a→@, o→0) não engana: é a primeira variação testada.", en: "Swapping letters for symbols (a→@, o→0) fools no one: it's the first variation tried." },
    date: { pt: "Tem um ano ou uma data. São poucos: um século inteiro de datas cabe em 36 mil palpites.", en: "It contains a year or a date. There are few: a whole century of dates fits in 36,000 guesses." },
    sequence: { pt: "É uma sequência de teclado ou de números (123, qwerty, abc).", en: "It's a keyboard or number sequence (123, qwerty, abc)." },
    phrase: {
      pt: "São palavras separadas: uma frase. O atacante combina palavras comuns, então contamos cada uma como um sorteio entre 20 mil, não como letras soltas. Cada palavra a mais multiplica o trabalho por 20 mil.",
      en: "Separate words: a passphrase. Attackers combine common words, so we count each one as a pick from 20,000, not as loose letters. Every extra word multiplies the work by 20,000.",
    },
    repeat: { pt: "Repetição (aaaa, abcabc) quase não acrescenta nada.", en: "Repetition (aaaa, abcabc) adds almost nothing." },
    short: { pt: "É curta. Cada caractere a mais multiplica o trabalho: o tamanho pesa mais que a variedade.", en: "It's short. Every extra character multiplies the work: length counts more than variety." },
    good: { pt: "Nenhum padrão óbvio encontrado. Daqui em diante, o que manda é o tamanho.", en: "No obvious pattern found. From here on, length is what matters." },
  },
  tipsTitle: { pt: "O que protege de verdade", en: "What actually protects you" },
  tips: {
    pt: [
      "Uma senha diferente em cada site. Vazamentos acontecem, e o atacante testa a mesma senha em todo lugar.",
      "Verificação em duas etapas. Mesmo com a senha certa, falta o código do seu celular.",
      "Um gerenciador de senhas lembrando por você. Aí cada senha pode ser longa e aleatória.",
    ],
    en: [
      "A different password for every site. Leaks happen, and attackers try the same password everywhere.",
      "Two-step verification. Even with the right password, they still need the code on your phone.",
      "A password manager remembering for you. Then every password can be long and random.",
    ],
  },
  gen: {
    title: { pt: "Gerador de senhas grátis", en: "Free password generator" },
    lead: {
      pt: "Sorteada no seu navegador pelo gerador criptográfico do próprio sistema. Nada sai daqui.",
      en: "Drawn in your browser by the system's own cryptographic generator. Nothing leaves this page.",
    },
    phrase: { pt: "Frase para lembrar", en: "Phrase to remember" },
    random: { pt: "Aleatória, para o gerenciador", en: "Random, for a manager" },
    words: { pt: "{n} palavras", en: "{n} words" },
    length: { pt: "{n} caracteres", en: "{n} characters" },
    again: { pt: "Gerar outra", en: "Generate another" },
    copy: { pt: "Copiar", en: "Copy" },
    copied: { pt: "Copiada", en: "Copied" },
    test: { pt: "Testar no medidor", en: "Test it above" },
    strength: { pt: "Se vazar: {bcrypt} com bcrypt, {md5} com MD5", en: "If leaked: {bcrypt} with bcrypt, {md5} with MD5" },
    honest: {
      pt: "Contando que o atacante sabe exatamente como ela foi gerada ({options} opções por {unit}).",
      en: "Assuming the attacker knows exactly how it was made ({options} options per {unit}).",
    },
    unitWord: { pt: "palavra", en: "word" },
    unitChar: { pt: "caractere", en: "character" },
  },
  note: {
    pt: "Estimativas em ordem de grandeza. As velocidades vêm de benchmarks públicos do hashcat numa placa de vídeo atual.",
    en: "Order-of-magnitude estimates. Speeds come from public hashcat benchmarks on a current graphics card.",
  },
} as const;
