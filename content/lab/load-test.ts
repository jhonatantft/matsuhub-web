/** Interface copy of the load-test experiment (components/lab/load). Resolved per language on the server. */
export const LOAD_COPY = {
  aria: {
    pt: "Cena 3D em camadas: pessoas chegando ao site, a CDN, as máquinas da aplicação e o banco de dados, com as requisições passando entre elas. O painel ao lado descreve a mesma cena em números.",
    en: "Layered 3D scene: people arriving at the site, the CDN, the application machines and the database, with requests flowing between them. The panel next to it describes the same scene in numbers.",
  },
  hint: { pt: "Arraste para girar", en: "Drag to rotate" },
  tour: { pt: "Tour automático · use qualquer controle para assumir", en: "Auto tour · use any control to take over" },
  noWebgl: {
    pt: "Seu navegador não abriu a cena 3D, mas o painel funciona normalmente.",
    en: "Your browser couldn't open the 3D scene, but the panel works as usual.",
  },
  arch: {
    label: { pt: "Arquitetura", en: "Architecture" },
    single: { pt: "Servidor único", en: "Single server" },
    scalable: { pt: "Escalável", en: "Scalable" },
  },
  users: {
    label: { pt: "Pessoas no site agora", en: "People on the site right now" },
    slider: { pt: "Pessoas no site", en: "People on the site" },
  },
  presets: [
    { users: 150, label: { pt: "Dia comum", en: "Ordinary day" } },
    { users: 2500, label: { pt: "Post viral", en: "Viral post" } },
    { users: 20000, label: { pt: "Black Friday", en: "Black Friday" } },
  ],
  metrics: {
    p95: { pt: "Tempo de resposta (p95)", en: "Response time (p95)" },
    errors: { pt: "Erros", en: "Errors" },
    rps: { pt: "Requisições por segundo", en: "Requests per second" },
    machines: { pt: "Máquinas da aplicação", en: "App machines" },
    cpu: { pt: "Uso de CPU da aplicação", en: "App CPU usage" },
    db: { pt: "Banco de dados", en: "Database" },
    cdn: { pt: "CDN", en: "CDN" },
  },
  values: {
    down: { pt: "Fora do ar", en: "Down" },
    of: { pt: "de {n}", en: "of {n}" },
    fixed: { pt: "fixa", en: "fixed" },
    sameBox: { pt: "no mesmo servidor", en: "on the same server" },
    replicas: { pt: "{use} · {n} réplicas", en: "{use} · {n} replicas" },
    replica: { pt: "{use} · 1 réplica", en: "{use} · 1 replica" },
    noReplica: { pt: "{use} · sem réplica", en: "{use} · no replica" },
    noCdn: { pt: "sem CDN", en: "no CDN" },
    cdnShare: { pt: "entrega {n}% dos estáticos", en: "serves {n}% of static files" },
  },
  status: {
    ok: { pt: "Rápido", en: "Fast" },
    slow: { pt: "Lento", en: "Slow" },
    down: { pt: "Caindo", en: "Failing" },
  },
  chart: {
    title: { pt: "Tempo de resposta conforme o acesso cresce", en: "Response time as traffic grows" },
    x: { pt: "pessoas ao mesmo tempo", en: "people at once" },
  },
  verdict: {
    pt: "No modelo, o servidor único começa a falhar com cerca de {single} pessoas ao mesmo tempo. A arquitetura escalável segura até cerca de {scalable}, já com as {max} máquinas ligadas.",
    en: "In the model, the single server starts failing at about {single} people at once. The scalable architecture holds up to about {scalable}, with all {max} machines running.",
  },
  open: { pt: "Abrir camadas", en: "Pull layers apart" },
  close: { pt: "Juntar camadas", en: "Put layers back" },
  views: {
    label: { pt: "Câmera", en: "Camera" },
    iso: { pt: "3/4", en: "3/4" },
    side: { pt: "Lado", en: "Side" },
    top: { pt: "Topo", en: "Top" },
  },
  layers: {
    users: { pt: "Pessoas", en: "People" },
    cdn: { pt: "CDN · borda", en: "CDN · edge" },
    app: { pt: "Aplicação", en: "Application" },
    db: { pt: "Banco de dados", en: "Database" },
  },
  legend: {
    static: { pt: "arquivo estático", en: "static file" },
    dynamic: { pt: "requisição dinâmica", en: "dynamic request" },
    queued: { pt: "na fila", en: "queued" },
    error: { pt: "erro", en: "error" },
  },
};
