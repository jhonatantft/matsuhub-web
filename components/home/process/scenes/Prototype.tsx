import { cn } from "@/lib/cn";
import { dict, type Lang } from "@/lib/i18n";
import { easeOutCubic, seg } from "@/lib/math";
import { BrowserFrame } from "../BrowserFrame";
import { MiniPage } from "../MiniPage";
import { Cursor } from "../Overlays";

/** The wireframe becomes the styled page inside a browser window, then a preview link appears and gets clicked. */
export function Prototype({ t, lang = "pt" }: { t: number; lang?: Lang }) {
  const d = dict(lang).process.prototype;
  const enter = easeOutCubic(seg(t, 0, 0.6));
  const wipe = seg(t, 1.5, 3.6);
  const link = easeOutCubic(seg(t, 4.0, 4.5));
  const move = seg(t, 5.0, 5.9);
  const click = seg(t, 6.0, 6.6);
  const press = click > 0 && click < 0.5 ? 1 - Math.abs(click - 0.25) * 4 : 0;
  const tag = wipe <= 0 ? d.wireframe : wipe < 1 ? d.turning : d.real;

  return (
    <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-3.5 pt-8 sm:gap-4 sm:px-8 sm:pt-10 sm:pb-6">
      <div className="relative w-full max-w-[560px]" style={{ opacity: enter, transform: `translateY(${(1 - enter) * 16}px) scale(${0.97 + 0.03 * enter})` }}>
        <span
          className={cn(
            "absolute -top-7 left-0 z-30 rounded-full border px-2 py-0.5 font-mono text-[9.5px] tracking-[0.08em] uppercase transition-colors duration-500",
            wipe >= 1 ? "border-acc/50 bg-[#0b1408] text-acc" : "border-line-2 bg-bg text-mute",
          )}
        >
          {tag}
        </span>
        <BrowserFrame url={link > 0 ? `${d.url}1` : d.draft} flash={link > 0 ? 1 - seg(t, 4.5, 5.6) : 0}>
          <MiniPage lang={lang} s={{ wipe, widget: 0, cards: 0, cta: 0, whats: 0, replies: 0, press }}>
            <Cursor from={[78, 92]} to={[16, 56]} move={move} click={click} />
          </MiniPage>
        </BrowserFrame>
      </div>

      <div
        className="flex max-w-full items-center gap-2 rounded-full border border-acc/40 bg-[#0a1309] py-1 pr-1 pl-3 shadow-[0_0_34px_-10px_rgb(185_255_75/0.7)]"
        style={{ opacity: link, transform: `translateY(${(1 - link) * 10}px) scale(${0.9 + 0.1 * link})` }}
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-acc" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M6.8 9.2a2.6 2.6 0 0 0 3.7 0l2.2-2.2a2.6 2.6 0 0 0-3.7-3.7l-.8.8M9.2 6.8a2.6 2.6 0 0 0-3.7 0L3.3 9a2.6 2.6 0 0 0 3.7 3.7l.8-.8" />
        </svg>
        <span className="truncate font-mono text-[11px] text-ink">
          <span className="text-mute">{d.link}</span>
          {d.url}1
        </span>
        <span className="shrink-0 rounded-full bg-acc px-2.5 py-1 text-[10.5px] font-bold text-[#061006]">{d.open}</span>
      </div>
    </div>
  );
}
