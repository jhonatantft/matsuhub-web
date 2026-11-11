"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { DEMOS } from "@/content/site";

/**
 * MatsuHub's closing band after a demo's own footer: back in the host site's voice, the
 * question that matters, the two ways out and the other demos of the gallery.
 */
export function DemoOutro() {
  const pathname = usePathname();
  const current = DEMOS.find((demo) => pathname.startsWith(demo.href)) ?? DEMOS[0];
  const others = DEMOS.filter((demo) => demo.id !== current.id);

  return (
    <section
      aria-labelledby="demo-outro-title"
      className="relative z-10 overflow-hidden bg-[#050807] px-[var(--pad)] pt-[clamp(64px,9vw,128px)] pb-[clamp(104px,10vw,140px)] font-sans text-ink"
    >
      <i
        aria-hidden
        className="absolute inset-x-0 top-0 block h-px bg-[linear-gradient(90deg,transparent,var(--color-acc)_30%,var(--color-acc)_70%,transparent)] shadow-[0_0_14px_rgb(185_255_75/0.5)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[min(900px,120vw)] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(185_255_75/0.12),transparent)]"
      />

      <div className="relative mx-auto grid max-w-[1320px] gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16">
        <div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px] font-medium tracking-[0.14em] text-mute uppercase">
            <Logo wordmark={false} />
            <span>
              Este foi o demo para <span className="text-acc">{current.segment.toLowerCase()}</span>.
            </span>
          </p>
          <h2
            id="demo-outro-title"
            className="mt-6 max-w-[16ch] font-display text-[clamp(30px,4.6vw,64px)] leading-[1.02] font-semibold tracking-[-0.035em]"
          >
            Quer um site assim para o seu <span className="text-acc">negócio</span>?
          </h2>
          <p className="mt-5 max-w-[46ch] text-[16px] leading-relaxed text-mute">
            A MatsuHub cria o seu do zero — com a sua marca, os seus dados e um agente de IA atendendo de verdade.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 max-sm:flex-col">
            <Button href="/#contato" className="max-sm:w-full">
              Quero um site assim
            </Button>
            <Link href="/#demos" className="btn btn-ghost max-sm:w-full">
              <span aria-hidden>←</span> Voltar para a MatsuHub
            </Link>
          </div>
        </div>

        <div>
          <p className="label mb-4">Veja também</p>
          <ul className="grid gap-3">
            {others.map((demo) => (
              <li key={demo.id}>
                <Link
                  href={demo.href}
                  className="group flex items-stretch gap-4 rounded-[18px] border border-line bg-bg-2/80 p-2.5 pr-5 transition-[border-color,translate,box-shadow] duration-500 ease-soft hover:-translate-y-0.5 hover:border-acc/60 hover:shadow-[0_24px_60px_-34px_rgb(185_255_75/0.55)] focus-visible:border-acc"
                >
                  <span className="relative aspect-[4/3] w-[clamp(104px,32%,168px)] shrink-0 overflow-hidden rounded-[12px] bg-bg-3">
                    <Image
                      src={demo.image.src}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 168px, 32vw"
                      className="object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.05]"
                    />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col justify-center py-1">
                    <span className="font-mono text-[10.5px] font-medium tracking-[0.14em] text-acc uppercase">{demo.segment}</span>
                    <span className="mt-1.5 font-display text-[clamp(15px,1.5vw,19px)] leading-tight font-semibold tracking-[-0.02em]">
                      {demo.name}
                    </span>
                    <span className="mt-1.5 text-[13px] leading-snug text-mute max-sm:hidden">{demo.blurb}</span>
                    <span className="mt-2.5 inline-flex items-center gap-1.5 font-mono text-[11.5px] font-medium text-ink transition-colors group-hover:text-acc">
                      Ver demo
                      <span aria-hidden className="transition-transform duration-300 ease-soft group-hover:translate-x-1">
                        →
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
