import Link from "next/link";
import { AURORA } from "@/content/aurora";
import { AuroraLogo } from "../AuroraChrome";
import { SITE_NAV } from "./bus";

/** Aurora's footer: wordmark, the honest disclaimer and who made the demo. */
export function SiteFooter() {
  return (
    <footer className="border-t border-au-line px-[var(--pad)] pt-16 pb-24 sm:pb-16">
      <div className="mx-auto grid max-w-[1320px] gap-10 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <AuroraLogo place={false} />
          <p className="mt-6 max-w-[320px] font-aurora text-[20px] leading-snug font-light text-au-ink/90">{AURORA.tagline}</p>
          <p className="mt-3 text-[12.5px] text-au-mute">
            {AURORA.name} · {AURORA.location}
            <br />
            {AURORA.delivery}
          </p>
        </div>
        <nav aria-label="Rodapé" className="grid content-start gap-3 text-[13px]">
          {SITE_NAV.map((item) => (
            <a key={item.id} href={`#${item.id}`} className="w-fit text-au-ink/80 transition-colors hover:text-au-gold">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="grid content-start gap-3 text-[12.5px] leading-relaxed text-au-mute">
          <p>Imagens ilustrativas geradas por IA. Empreendimento fictício para demonstração.</p>
          <p>
            Site-demo por{" "}
            <Link href="/" className="font-semibold text-au-ink underline decoration-au-gold/50 underline-offset-4 hover:text-au-gold">
              MatsuHub
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
