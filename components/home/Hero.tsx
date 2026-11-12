import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Magnetic } from "@/components/ui/Magnetic";
import { Reveal } from "@/components/ui/Reveal";
import { HOME, SITE } from "@/content/site";
import { dict, sectionHref, t, type Lang } from "@/lib/i18n";
import { HeroScene } from "./HeroScene";

const line = (i: number) => ({ "--i": i }) as React.CSSProperties;

export function Hero({ lang = "pt" }: { lang?: Lang }) {
  const copy = HOME.hero;
  const [l1, l2, l3, l4] = t(copy.lines, lang);
  const d = dict(lang).common;
  return (
    <header className="relative flex min-h-svh flex-col justify-center overflow-hidden px-[var(--pad)] pt-[120px] pb-[90px]">
      <HeroScene />

      <div className="relative z-[2]">
        <Reveal>
          <Label dot>{t(SITE.tagline, lang)}</Label>
        </Reveal>

        <h1 className="h-hero mt-[26px] mb-7">
          <span className="line-mask" style={line(0)}>
            <span>{l1}</span>
          </span>
          <span className="line-mask" style={line(1)}>
            <span>{l2}</span>
          </span>
          <span className="line-mask" style={line(2)}>
            <span className="text-outline">{l3}</span>
          </span>
          <span className="line-mask" style={line(3)}>
            <span className="text-gradient">{l4}</span>
          </span>
        </h1>

        <Reveal as="p" delay={0.5} className="max-w-[50ch] text-[clamp(16px,1.3vw,19px)] text-mute">
          {t(copy.sub, lang)}
        </Reveal>

        <Reveal delay={0.65} className="mt-[34px] flex flex-wrap gap-3">
          <Magnetic>
            <Button href={sectionHref("contact", lang)}>{d.startProject}</Button>
          </Magnetic>
          <Button href={sectionHref("demos", lang)} variant="ghost" arrow="↓">
            {d.seeDemos}
          </Button>
        </Reveal>
      </div>

      <div className="absolute inset-x-[var(--pad)] bottom-[26px] z-[2] flex justify-between font-mono text-[11px] font-medium tracking-[0.14em] text-mute uppercase">
        <span>{t(copy.scroll, lang)}</span>
        <span className="hidden sm:inline">{t(copy.tags, lang)}</span>
      </div>
    </header>
  );
}
