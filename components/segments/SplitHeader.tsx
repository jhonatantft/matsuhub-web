import { Label } from "@/components/ui/Label";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";

type SplitHeaderProps = {
  /** e.g. "01 — O que trava hoje" */
  label: string;
  /** id of the h2, for the section's aria-labelledby. */
  id: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  className?: string;
};

/** Section opener used across the segment pages: label + h2 on the left, the lead on the right (stacked on phones). */
export function SplitHeader({ label, id, title, lead, className }: SplitHeaderProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-x-16 gap-y-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-end", className)}>
      <div>
        <Reveal>
          <Label>{label}</Label>
        </Reveal>
        <Reveal as="h2" id={id} delay={0.06} className="h-section mt-[18px] max-w-[18ch] text-[clamp(26px,3.6vw,52px)]">
          {title}
        </Reveal>
      </div>
      {lead && (
        <Reveal as="p" delay={0.1} className="max-w-[48ch] text-[clamp(16px,1.25vw,18px)] text-mute">
          {lead}
        </Reveal>
      )}
    </div>
  );
}
