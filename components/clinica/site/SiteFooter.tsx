import Link from "next/link";
import { ELO } from "@/content/clinica";
import { EloWordmark } from "./ui";

export function SiteFooter() {
  return (
    <footer className="border-t border-el-line bg-el-bg px-[var(--pad)] pt-14 pb-28 sm:pb-14">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-end justify-between gap-x-10 gap-y-8">
        <div>
          <EloWordmark />
          <p className="mt-4 text-[15px] text-el-mute">
            {ELO.full} · {ELO.address}
          </p>
        </div>
        <div className="grid gap-2 text-[13.5px] text-el-mute sm:text-right">
          <p>Imagens ilustrativas geradas por IA. Clínica fictícia para demonstração. Profissionais fictícios.</p>
          <p>
            Site-demo por{" "}
            <Link href="/" className="font-elo font-medium text-el-ink underline-offset-4 transition-colors hover:text-el-acc hover:underline">
              MatsuHub
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
