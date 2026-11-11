# MatsuHub web — design system and working rules

The site of a software house (web products + AI agents). It must feel **dark, holographic and alive**: near-black canvas, lime and mint light, wide display type, and every section reacting to scroll or cursor. Copy is **pt-BR**. The original direction lives in `mock/index.html` (approved by the owner: "follow this line, make it much better").

## Two brands on one site

| | MatsuHub (the site) | Aurora (the sample real-estate site) |
|---|---|---|
| Used in | everything | `components/aurora/**`, `/demos/imobiliarias`, inside the homepage showcase window |
| Colors | `bg`, `bg-2`, `bg-3`, `ink`, `mute`, `dim`, `line`, `line-2`, `acc` (lime), `acc-2` (mint), `warm`, `danger` | `au-bg`, `au-bg-2` (deep navy), `au-ink`, `au-mute`, `au-gold`, `au-line` |
| Type | `font-display` (Unbounded), `font-sans` (Manrope), `font-mono` (JetBrains Mono) | `font-aurora` (Fraunces serif) for headings, `font-sans` for text |
| Mood | futuristic HUD, hologram, code | quiet luxury: photoreal images, thin gold lines, lots of air |

Aurora must read as a *different client's site* shown inside ours. Never mix lime into Aurora UI, or gold into MatsuHub UI — except the showcase "blueprint → real" moment, where the hologram hands over to the photo.

## Tokens and utilities (`app/globals.css`, Tailwind v4)

- Colors are Tailwind utilities: `bg-bg`, `text-mute`, `border-line`, `text-acc`, `bg-au-bg`, `text-au-gold`…
- Easing: `ease-soft` (default for everything), `ease-inout`.
- Type presets: `h-hero`, `h-section`, `h-card`, `label` (mono uppercase lime), `text-outline`, `text-outline-acc`, `text-gradient`.
- Surfaces: `card` (bordered gradient panel, radius 20), `glass` (blurred dark panel), `chip` (mono pill).
- Buttons: `<Button>` (`components/ui/Button`) → classes `btn btn-primary|btn-ghost btn-sm`.
- Page gutter: `px-[var(--pad)]`. Nav height: `var(--nav-h)`. Section rhythm: `py-[clamp(80px,11vw,150px)]`.
- Layers: ambient grid `z-0`, cursor glow `z-[1]`, page content `z-10`, nav `z-50`, dialogs `z-[80]`, film grain `z-[90]`.

## Shared building blocks — reuse, don't re-invent

- `components/ui`: `Button`, `Label` (scrambling mono label), `Reveal` (fade/slide on first view; `delay` staggers), `SectionHeader` (label + h2 + lead), `Magnetic`, `Logo`.
- `lib/ticker.ts` → `onFrame((time, dt) => …)`: **the only animation loop**. Never call `requestAnimationFrame` yourself; `?t=` freezes time through it.
- `lib/scroll.ts` → `pinProgress(el)` for tall wrappers with a sticky child (honours `?p=`), `viewProgress(el)`, `isOnScreen(el)`, `lenisRef`.
- `lib/math.ts` → `clamp, lerp, seg, remap, smoothstep, easeOutCubic, easeInOutCubic, easeOutExpo, damp`.
- `lib/env.ts` → `reducedMotion()`, `coarsePointer()`, `quality()`, `maxDpr(q)`.
- `content/site.ts`, `content/aurora.ts` → all copy and sample data.

## Motion rules

1. Motion has a job: reveal, explain, or respond. One hero moment per section, not five.
2. Scroll-driven scenes read progress every frame via `onFrame` + `pinProgress`; smooth values with `damp`, never CSS transitions on scroll-bound properties.
3. Animate only `transform`, `opacity`, `clip-path`, shader uniforms. No layout thrash: measure once, cache, re-measure on resize.
4. `prefers-reduced-motion`: no autoplay loops, no parallax, no scramble; scroll scenes still work but cut instead of tween. Check with `reducedMotion()`.
5. Everything must hold at 390 px wide. Touch devices get no hover-only information.

## WebGL rules (three.js 0.187, plain — no react-three-fiber)

- Client component, mounted via `next/dynamic` with `ssr: false` from another client component.
- Create renderer/scene in `useEffect`; on cleanup dispose geometries, materials, textures, render targets, the renderer, and remove every listener/observer. React StrictMode mounts twice in dev — it must survive that.
- Size with a `ResizeObserver` on the canvas parent; DPR from `maxDpr(quality())`.
- Render only while on screen (`IntersectionObserver` or `isOnScreen`) and the tab is visible.
- No allocations in the frame loop. Shaders as template strings in `.ts` files.
- If WebGL is missing or the context is lost, render nothing and leave the page usable.

## Next.js 16 gotchas (this is not the Next you remember — docs in `node_modules/next/dist/docs/`)

- `cacheComponents: true`: **never** call `Math.random()`, `Date.now()` or `new Date()` while rendering (server or client) — the build fails. Use them inside effects/handlers only.
- No `useSearchParams()` (needs Suspense). Read URL params on the client with `labParam()` inside effects.
- `dynamic(..., { ssr: false })` only inside Client Components.
- Don't add `runtime`, `dynamic` or `revalidate` route segment exports.
- No new npm dependencies; installed: `three`, `lenis`, `zod`, `clsx`, `@supabase/supabase-js`.

## Checking your work

A dev server runs at `http://localhost:3000` (never start another, never run `next build` while others work).

```bash
node scripts/shot.mjs "http://localhost:3000/lab/hub" .shots/hub.png                 # 1440×900, captured 2.5 s after load
node scripts/shot.mjs "http://localhost:3000/lab/hub" .shots/hub-m.png --mobile      # real 390×844 touch viewport
node scripts/shot.mjs "http://localhost:3000/lab/showcase?p=0.55" .shots/s.png       # force a pinned scene's progress
node scripts/shot.mjs "http://localhost:3000/" .shots/home.png --y 2400 --wait 3000  # scroll first
node scripts/shot.mjs "http://localhost:3000/" .shots/full.png --full                # whole page
node scripts/shot.mjs "<url>" .shots/x.png --eval "document.querySelector('button').click()"
```

It runs real headless Chrome at 60 fps with WebGL and prints the page's JavaScript/console errors to stderr — fix every one. Then open the PNG with the Read tool and judge it like a demanding art director; iterate. Prefix your files in `.shots/` so parallel workers don't overwrite each other.

URL params (`lib/lab.ts`): `?t=4` freezes animation time at 4 s (the ticker then reports `dt = 1`, so `damp` snaps — derive state from `time`, don't accumulate `dt`), `?p=0.5` forces a pinned scene's progress, `?y=1200` jumps to a scroll offset.

Type-check only your own files: `npx tsc --noEmit 2>&1 | grep <your-folder>`; lint with `npx eslint <files>` (React Compiler rules are on: no ref reads during render, no `setState` straight in an effect body).
