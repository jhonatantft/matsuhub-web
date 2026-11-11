import Link from "next/link";
import { PULSO } from "@/content/pulso";
import { Wordmark } from "./bits";

export function SiteFooter() {
  return (
    <footer className="border-t border-pu-line bg-pu-bg-2 px-[var(--pad)] pt-14 pb-28 sm:pb-14">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-end justify-between gap-x-10 gap-y-8">
        <div>
          <Wordmark />
          <p className="mt-4 font-pulso text-[17px] font-light tracking-[-0.02em] text-pu-mute">{PULSO.tagline}</p>
        </div>
        <div className="grid gap-2 text-[12px] text-pu-mute sm:text-right">
          <p>Loja fictícia para demonstração. Imagens geradas por IA. Nenhum pagamento é processado.</p>
          <p>
            Site-demo por{" "}
            <Link href="/" className="font-semibold text-pu-ink underline-offset-4 transition-colors hover:text-pu-acc hover:underline">
              MatsuHub
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
