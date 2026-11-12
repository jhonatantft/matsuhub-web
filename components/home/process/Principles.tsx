import { Reveal } from "@/components/ui/Reveal";
import { PROCESS, type PrincipleIcon } from "@/content/site";
import { t, type Lang } from "@/lib/i18n";

const ICONS: Record<PrincipleIcon, React.ReactNode> = {
  eye: (
    <>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <path d="M9.5 10h5M12 7.5v5" />
    </>
  ),
  chat: (
    <>
      <path d="M4 18.5 5.3 15A7.5 7.5 0 1 1 9 18.2Z" />
      <path d="M9 10.5h6M9 13.5h4" />
    </>
  ),
  deploy: (
    <>
      <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" />
      <path d="M4 14v4.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V14" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.2 2.4 2.4 4.8-5" />
    </>
  ),
};

/** The working principles behind the stage, as a compact row of small cards. */
export function Principles({ lang = "pt" }: { lang?: Lang }) {
  return (
    <ul className="mt-6 grid gap-px overflow-hidden rounded-[18px] border border-line bg-line sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
      {PROCESS.principles.map((p, i) => (
        <Reveal as="li" key={p.icon} delay={0.05 * i} className="group flex gap-4 bg-bg/95 px-5 py-5 sm:px-6">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] border border-line-2 bg-[linear-gradient(160deg,rgb(185_255_75/0.12),rgb(62_242_196/0.04))] text-acc transition-colors duration-300 group-hover:border-acc/60">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {ICONS[p.icon]}
            </svg>
          </span>
          <div>
            <h3 className="text-[15px] font-bold leading-snug text-ink">{t(p.title, lang)}</h3>
            <p className="mt-1 text-[14px] leading-snug text-mute">{t(p.text, lang)}</p>
          </div>
        </Reveal>
      ))}
    </ul>
  );
}
