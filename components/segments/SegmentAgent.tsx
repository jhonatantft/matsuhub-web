import { Label } from "@/components/ui/Label";
import { Reveal } from "@/components/ui/Reveal";
import { fill, SEGMENT_UI, t, type Lang, type Segment } from "@/content/segments";
import { cn } from "@/lib/cn";

/**
 * "03 — O agente de IA": what the segment's agent does and never does, beside a short scripted
 * conversation (labelled "exemplo") where the tool calls show it working in real systems.
 */
export function SegmentAgent({ segment, lang }: { segment: Segment; lang: Lang }) {
  const { agent } = segment;
  const ui = SEGMENT_UI.agent;

  return (
    <section aria-labelledby="agente-title" className="relative px-[var(--pad)] py-[clamp(64px,8vw,120px)]">
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-[62%] aspect-square w-[min(900px,110vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(62_242_196/0.09),transparent)]"
      />
      <div className="relative mx-auto grid max-w-[1360px] grid-cols-1 gap-x-[clamp(32px,5vw,80px)] gap-y-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center">
        <div>
          <Reveal>
            <Label>{t(ui.label, lang)}</Label>
          </Reveal>
          <Reveal as="h2" id="agente-title" delay={0.06} className="h-section mt-[18px] max-w-[17ch] text-[clamp(26px,3.6vw,52px)]">
            {t(agent.title, lang)}
          </Reveal>
          <Reveal as="p" delay={0.1} className="mt-5 max-w-[50ch] text-[clamp(16px,1.25vw,18px)] text-mute">
            {t(agent.lead, lang)}
          </Reveal>

          <div className="mt-9 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Reveal delay={0.12}>
              <h3 className="font-mono text-[11px] font-medium tracking-[0.16em] text-acc uppercase">{t(ui.does, lang)}</h3>
              <ul className="mt-4 grid gap-3">
                {agent.does.map((item) => (
                  <li key={item[lang]} className="flex gap-3 text-[15px] leading-snug text-ink/85">
                    <Mark kind="yes" />
                    {t(item, lang)}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.18}>
              <h3 className="font-mono text-[11px] font-medium tracking-[0.16em] text-warm uppercase">{t(ui.never, lang)}</h3>
              <ul className="mt-4 grid gap-3">
                {agent.never.map((item) => (
                  <li key={item[lang]} className="flex gap-3 text-[15px] leading-snug text-ink/85">
                    <Mark kind="no" />
                    {t(item, lang)}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>

        <Reveal delay={0.1}>
          <Chat segment={segment} lang={lang} />
        </Reveal>
      </div>
    </section>
  );
}

function Mark({ kind }: { kind: "yes" | "no" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px] leading-none",
        kind === "yes" ? "border-acc/50 text-acc" : "border-warm/50 text-warm",
      )}
    >
      {kind === "yes" ? "✓" : "×"}
    </span>
  );
}

function Chat({ segment, lang }: { segment: Segment; lang: Lang }) {
  const { agent, demo } = segment;
  const ui = SEGMENT_UI.agent;
  const role = t(agent.role, lang);

  return (
    <figure aria-label={fill(t(ui.chatLabel, lang), { agent: demo.agent, role })}>
      <div className="rounded-[26px] bg-[linear-gradient(150deg,rgb(185_255_75/0.42),rgb(190_255_215/0.10)_32%,rgb(190_255_215/0.06)_70%,rgb(62_242_196/0.34))] p-px shadow-[0_50px_140px_-70px_rgb(185_255_75/0.5)]">
        <div className="overflow-hidden rounded-[25px] bg-[rgb(7_13_10/0.9)] backdrop-blur-xl">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3.5 sm:px-5">
            <span
              aria-hidden
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[linear-gradient(140deg,var(--color-acc),var(--color-acc-2))] font-display text-[15px] font-bold text-[#061006]"
            >
              {demo.agent.charAt(0)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-[15px] font-bold text-ink">
                {demo.agent}
                <i aria-hidden className="h-1.5 w-1.5 rounded-full bg-acc-2 shadow-[0_0_8px_var(--color-acc-2)]" />
              </span>
              <span className="block truncate font-mono text-[10.5px] tracking-[0.1em] text-mute uppercase">
                {role} · {t(agent.chat.channel, lang)}
              </span>
            </span>
            <span className="chip shrink-0 border-warm/40 text-warm">{t(ui.example, lang)}</span>
          </div>

          <ol className="grid grid-cols-1 gap-3 px-4 py-5 sm:px-5 sm:py-6">
            <li aria-hidden className="text-center font-mono text-[10px] tracking-[0.14em] text-dim">
              {agent.chat.time}
            </li>
            {agent.chat.lines.map((line, i) => (
              <Reveal as="li" key={i} delay={0.15 + i * 0.09} className={cn("flex", line.kind === "in" ? "justify-start" : line.kind === "out" ? "justify-end" : "justify-center")}>
                {line.kind === "tool" ? (
                  <span className="inline-flex max-w-full items-center gap-2 rounded-[14px] border border-dashed border-acc-2/35 bg-acc-2/[0.05] px-3 py-1.5 font-mono text-[10.5px] leading-snug tracking-[0.04em] text-acc-2">
                    <span aria-hidden>⚙</span>
                    <span className="min-w-0">{t(line.text, lang)}</span>
                  </span>
                ) : (
                  <p
                    className={cn(
                      "max-w-[86%] px-4 py-2.5 text-[14.5px] leading-snug",
                      line.kind === "in"
                        ? "rounded-[18px_18px_18px_6px] border border-line bg-bg-3 text-ink/90"
                        : "rounded-[18px_18px_6px_18px] border border-acc/25 bg-acc/[0.09] text-ink",
                    )}
                  >
                    <span className="sr-only">{line.kind === "in" ? t(ui.customer, lang) : demo.agent}: </span>
                    {t(line.text, lang)}
                  </p>
                )}
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
      <figcaption className="mt-4 text-center font-mono text-[11px] leading-relaxed tracking-[0.04em] text-mute">{t(ui.note, lang)}</figcaption>
    </figure>
  );
}
