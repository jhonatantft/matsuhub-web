import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { NAV, SITE } from "@/content/site";

export function Footer() {
  return (
    <footer className="relative z-10 overflow-hidden border-t border-line px-[var(--pad)] pt-16 pb-8">
      <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-5 max-w-[34ch] text-[15px] text-mute">{SITE.description}</p>
        </div>
        <nav aria-label="Rodapé">
          <p className="label mb-4 text-mute">Navegar</p>
          <ul className="grid gap-2 text-[15px]">
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="text-mute transition-colors hover:text-acc">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="label mb-4 text-mute">Demos</p>
          <ul className="grid gap-2 text-[15px]">
            <li>
              <Link href="/demos/imobiliarias" className="text-mute transition-colors hover:text-acc">
                Imobiliárias — Aurora
              </Link>
            </li>
            <li className="text-mute/80">Clínicas · em breve</li>
            <li>
              <Link href="/demos/restaurantes" className="text-mute transition-colors hover:text-acc">
                Restaurantes — Maré
              </Link>
            </li>
            <li>
              <Link href="/demos/ecommerce" className="text-mute transition-colors hover:text-acc">
                E-commerce — Pulso
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <p
        aria-hidden
        className="text-outline mt-16 font-display text-[clamp(48px,17vw,280px)] leading-[0.82] font-extrabold tracking-[-0.06em] whitespace-nowrap opacity-25 select-none [-webkit-text-stroke-width:2px]"
      >
        matsuhub
      </p>

      <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-line pt-6 font-mono text-xs tracking-[0.1em] text-mute uppercase">
        <span>
          © {SITE.year} {SITE.name}
        </span>
        <span>{SITE.tagline}</span>
      </div>
    </footer>
  );
}
