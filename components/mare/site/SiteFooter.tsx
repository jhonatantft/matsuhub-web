import Link from "next/link";
import { MARE } from "@/content/mare";
import { MareWordmark } from "./SiteSection";

export function SiteFooter() {
  return (
    <footer className="border-t border-ma-line bg-ma-bg px-[var(--pad)] pt-14 pb-24 sm:pb-14">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-end justify-between gap-x-10 gap-y-8">
        <div>
          <MareWordmark />
          <p className="mt-4 font-mare text-[19px] text-ma-mute italic">
            {MARE.tagline} · {MARE.address}
          </p>
        </div>
        <div className="grid gap-2 text-[12px] text-ma-mute sm:text-right">
          <p>Imagens ilustrativas geradas por IA. Restaurante fictício para demonstração.</p>
          <p>
            Site-demo por{" "}
            <Link href="/" className="font-semibold text-ma-ink underline-offset-4 transition-colors hover:text-ma-ember hover:underline">
              MatsuHub
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
