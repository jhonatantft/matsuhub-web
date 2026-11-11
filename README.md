# MatsuHub — site

Site da software house: produtos web sob medida e agentes de IA. Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, three.js, Lenis, Supabase.

## Rodar

```bash
npm install
```

```bash
npm run dev
```

Abra http://localhost:3000.

| Rota | O que é |
|---|---|
| `/` | Home: hero WebGL, serviços, vitrine do demo, agentes, processo, contato |
| `/demos/imobiliarias` | Site-demo completo "Aurora Residence" |
| `/api/lead` | Recebe os formulários e grava no Supabase |
| `/lab/*` | Páginas de teste de cada parte (só em desenvolvimento) |

## Variáveis de ambiente

Copie `.env.example` para `.env.local`:

- `NEXT_PUBLIC_SITE_URL` — endereço público do site (metadados, sitemap).
- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` — só no servidor. Sem elas o formulário responde normalmente em desenvolvimento, mas não grava nada.

O passo a passo do banco está em `supabase/README.md`.

## Publicar na Vercel

1. Suba o projeto para um repositório Git e importe-o na Vercel (detecta Next.js sozinho).
2. Cadastre as três variáveis acima em *Settings → Environment Variables*.
3. Recomenda-se uma regra de rate limit para `POST /api/lead` no Firewall da Vercel.

## Onde fica cada coisa

- `docs/design-system.md` — regras de design, tokens, utilitários e como conferir o trabalho. Leia antes de mexer.
- `content/` — todo o texto do site (`site.ts`) e os dados do demo (`aurora.ts`).
- `components/home` — seções da home; `components/three/hub` — cena do hero; `components/aurora` — tour e página do demo.
- `public/aurora` — imagens e vídeos do demo, gerados por IA. O empreendimento é fictício.
- `scripts/shot.mjs` — captura de tela em Chrome sem interface, usada para conferir o visual.
- `mock/index.html` — o primeiro mock aprovado, mantido como referência.
