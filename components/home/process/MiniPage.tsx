import { dict, type Lang } from "@/lib/i18n";
import { clamp, easeOutCubic } from "@/lib/math";

/**
 * The sample client page that the project is building, laid out in % of a 16:10 box with cqw type,
 * so overlays (comment pins, cursor) can be placed with the same coordinates at any size.
 * A deliberately different palette from MatsuHub: it is "the client's site".
 */
export type PageState = {
  /** 0..1 wipe from wireframe to styled page. */
  wipe: number;
  /** 0..1 the AI agent widget being built in. */
  widget: number;
  /** 0..1 feature cards filled in (skeleton → real). */
  cards: number;
  /** 0..1 the CTA growing after the client's comment. */
  cta: number;
  /** 0..1 WhatsApp button in the nav. */
  whats: number;
  /** 0..1 quick replies under the agent bubble (improvement after launch). */
  replies: number;
  /** 0..1 press feedback on the CTA. */
  press?: number;
};

export const SPOTS = {
  cta: { x: 25, y: 49 },
  nav: { x: 80, y: 6 },
} as const;

const C = { bg: "#f4f1eb", ink: "#16181d", soft: "#e6e1d8", acc: "#ff6a3d", acc2: "#ffb48a" };

function Wireframe() {
  const box = "absolute rounded-[1cqw] border border-dashed border-[rgb(190_255_215/0.28)]";
  return (
    <div aria-hidden className="absolute inset-0 bg-[#0a0f0d] [background-image:linear-gradient(rgb(190_255_215/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(190_255_215/0.05)_1px,transparent_1px)] [background-size:5cqw_5cqw]">
      <div className={box} style={{ left: "5%", top: "5%", width: "16%", height: "6%" }} />
      {[52, 60, 68].map((x) => (
        <div key={x} className="absolute h-[1.1cqw] rounded-full bg-[rgb(190_255_215/0.16)]" style={{ left: `${x}%`, top: "7.6%", width: "6%" }} />
      ))}
      <div className={box} style={{ left: "5%", top: "19%", width: "48%", height: "15%" }}>
        <span className="absolute top-1/2 left-[4%] -translate-y-1/2 font-mono text-[1.8cqw] text-[rgb(190_255_215/0.4)]">título</span>
      </div>
      <div className="absolute h-[1.2cqw] rounded-full bg-[rgb(190_255_215/0.12)]" style={{ left: "5%", top: "39%", width: "42%" }} />
      <div className="absolute h-[1.2cqw] rounded-full bg-[rgb(190_255_215/0.12)]" style={{ left: "5%", top: "43.5%", width: "34%" }} />
      <div className={box} style={{ left: "5%", top: "51%", width: "20%", height: "9%" }}>
        <span className="absolute inset-0 grid place-items-center font-mono text-[1.7cqw] text-[rgb(190_255_215/0.45)]">botão</span>
      </div>
      <div className={box} style={{ left: "60%", top: "17%", width: "35%", height: "46%" }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <path d="M0 0 100 100M100 0 0 100" stroke="rgb(190 255 215 / 0.18)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      {[5, 36.7, 68.3].map((x) => (
        <div key={x} className={box} style={{ left: `${x}%`, top: "69%", width: "26.7%", height: "24%" }} />
      ))}
    </div>
  );
}

function Styled({ s, lang }: { s: PageState; lang: Lang }) {
  const copy = dict(lang).process.page;
  const cta = easeOutCubic(s.cta);
  const whats = easeOutCubic(s.whats);
  const widget = easeOutCubic(s.widget);
  const replies = easeOutCubic(s.replies);
  const press = s.press ?? 0;
  return (
    <div aria-hidden className="absolute inset-0" style={{ background: C.bg, color: C.ink }}>
      {/* soft light */}
      <div className="absolute inset-0 bg-[radial-gradient(60%_70%_at_85%_30%,rgb(255_106_61/0.12),transparent_70%)]" />

      {/* nav */}
      <div className="absolute flex items-center gap-[1cqw]" style={{ left: "5%", top: "5.2%" }}>
        <span className="h-[2.4cqw] w-[2.4cqw] rounded-[0.7cqw]" style={{ background: C.acc }} />
        <span className="font-sans text-[2.1cqw] font-extrabold tracking-[-0.02em]">sua marca</span>
      </div>
      {[52, 60, 68].map((x) => (
        <div key={x} className="absolute h-[1.1cqw] rounded-full" style={{ left: `${x}%`, top: "7.6%", width: "6%", background: C.soft }} />
      ))}
      <div
        className="absolute flex origin-right items-center justify-center gap-[0.8cqw] rounded-full font-sans text-[1.7cqw] font-bold text-white"
        style={{
          left: "77%",
          top: "4.4%",
          width: "18%",
          height: "7%",
          background: "#1fb855",
          opacity: whats,
          transform: `scale(${0.6 + 0.4 * whats})`,
        }}
      >
        <svg viewBox="0 0 24 24" className="h-[2cqw] w-[2cqw]" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M4 20l1.3-3.8A8 8 0 1 1 8 19z" />
        </svg>
        WhatsApp
      </div>

      {/* hero */}
      <p className="absolute font-sans text-[4.3cqw] leading-[1.06] font-extrabold tracking-[-0.035em]" style={{ left: "5%", top: "18.5%", width: "52%" }}>
        {copy.title}
        <span style={{ color: C.acc }}>{copy.accent}</span>
      </p>
      <div className="absolute h-[1.2cqw] rounded-full" style={{ left: "5%", top: "39%", width: "42%", background: C.soft }} />
      <div className="absolute h-[1.2cqw] rounded-full" style={{ left: "5%", top: "43.5%", width: "34%", background: C.soft }} />
      <div
        className="absolute flex origin-left items-center justify-center rounded-full font-sans text-[1.8cqw] font-bold whitespace-nowrap text-white"
        style={{
          left: "5%",
          top: "51%",
          width: "20%",
          height: "9%",
          background: C.acc,
          boxShadow: `0 ${0.8 + cta}cqw ${2 + 2 * cta}cqw -0.8cqw rgb(255 106 61 / ${0.45 + 0.25 * cta})`,
          transform: `scale(${(1 + 0.32 * cta) * (1 - 0.06 * press)})`,
        }}
      >
        {copy.cta}
      </div>

      {/* image */}
      <div
        className="absolute overflow-hidden rounded-[2cqw]"
        style={{ left: "60%", top: "17%", width: "35%", height: "46%", background: `linear-gradient(160deg, ${C.acc2}, ${C.acc} 70%, #c9442a)` }}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <circle cx="70" cy="30" r="13" fill="#fff4e8" opacity="0.85" />
          <path d="M0 78 Q25 55 50 72 T100 62 V100 H0Z" fill="#16181d" opacity="0.18" />
          <path d="M0 88 Q30 70 60 85 T100 80 V100 H0Z" fill="#16181d" opacity="0.28" />
        </svg>
      </div>

      {/* feature cards: skeleton in the prototype, real once built */}
      {[5, 36.7, 68.3].map((x, i) => {
        const p = clamp(s.cards * 1.6 - i * 0.3);
        return (
          <div
            key={x}
            className="absolute overflow-hidden rounded-[1.4cqw] border bg-white"
            style={{ left: `${x}%`, top: "69%", width: "26.7%", height: "24%", borderColor: C.soft }}
          >
            <div className="absolute rounded-[0.8cqw]" style={{ left: "9%", top: "16%", width: "4.5cqw", height: "4.5cqw", background: p > 0 ? C.acc : C.soft, opacity: 0.25 + 0.75 * p }} />
            <div className="absolute h-[1.3cqw] origin-left rounded-full" style={{ left: "9%", top: "56%", width: "70%", transform: `scaleX(${0.57 + 0.43 * p})`, background: p > 0.5 ? C.ink : C.soft, opacity: 0.85 }} />
            <div className="absolute h-[1cqw] rounded-full" style={{ left: "9%", top: "74%", width: "70%", background: C.soft }} />
            {p < 1 && (
              <div className="absolute inset-0 bg-[linear-gradient(100deg,transparent_30%,rgb(255_255_255/0.75)_50%,transparent_70%)]" style={{ opacity: 1 - p }} />
            )}
          </div>
        );
      })}

      {/* AI agent widget */}
      <div
        className="absolute origin-bottom-right rounded-[1.6cqw] rounded-br-[0.4cqw] bg-white font-sans text-[1.75cqw] leading-snug shadow-[0_1cqw_3cqw_-1cqw_rgb(22_24_29/0.35)]"
        style={{ right: "13.5%", bottom: "20%", width: "33%", padding: "1.4cqw 1.6cqw", opacity: widget, transform: `scale(${0.7 + 0.3 * widget})` }}
      >
        <b className="block text-[1.5cqw] tracking-[0.04em] uppercase" style={{ color: C.acc }}>
          {copy.assistant}
        </b>
        {copy.greeting}
        <div className="absolute top-full left-0 mt-[1cqw] flex gap-[0.8cqw]" style={{ opacity: replies, transform: `translateY(${(1 - replies) * -1.2}cqw)` }}>
          {copy.replies.map((r) => (
            <span key={r} className="rounded-full border bg-white px-[1cqw] py-[0.5cqw] text-[1.5cqw] font-bold whitespace-nowrap" style={{ borderColor: C.acc, color: C.acc }}>
              {r}
            </span>
          ))}
        </div>
      </div>
      <div
        className="absolute grid place-items-center rounded-full text-white shadow-[0_1cqw_2.4cqw_-0.6cqw_rgb(255_106_61/0.7)]"
        style={{ left: "88%", top: "82%", width: "6.4cqw", height: "6.4cqw", background: C.acc, opacity: widget, transform: `scale(${widget})` }}
      >
        <svg viewBox="0 0 24 24" className="h-[3.2cqw] w-[3.2cqw]" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 18.5 5.3 15A7.5 7.5 0 1 1 9 18.2Z" />
        </svg>
      </div>
    </div>
  );
}

/** Wireframe underneath, styled page revealed over it by `wipe` (with a scan line at the edge). */
export function MiniPage({ s, lang = "pt", children }: { s: PageState; lang?: Lang; children?: React.ReactNode }) {
  const w = clamp(s.wipe);
  return (
    <>
      {w < 1 && <Wireframe />}
      {w > 0 && (
        <div className="absolute inset-0" style={{ clipPath: w < 1 ? `inset(0 ${(1 - w) * 100}% 0 0)` : undefined }}>
          <Styled s={s} lang={lang} />
        </div>
      )}
      {w > 0 && w < 1 && (
        <div aria-hidden className="absolute inset-0" style={{ transform: `translateX(${w * 100}%)` }}>
          <div className="absolute inset-y-0 left-0 w-[2px] bg-acc shadow-[0_0_14px_4px_rgb(185_255_75/0.7),0_0_40px_10px_rgb(62_242_196/0.35)]" />
        </div>
      )}
      {children}
    </>
  );
}
