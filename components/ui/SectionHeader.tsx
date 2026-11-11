import { cn } from "@/lib/cn";
import { Label } from "./Label";
import { Reveal } from "./Reveal";

type SectionHeaderProps = {
  /** e.g. "01 — O que construímos" */
  label: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  className?: string;
  align?: "left" | "center";
};

/** Standard section opener: mono label, display heading, muted lead paragraph. */
export function SectionHeader({ label, title, sub, className, align = "left" }: SectionHeaderProps) {
  const center = align === "center";
  return (
    <div className={cn(center && "text-center", className)}>
      <Reveal>
        <Label className={cn(center && "justify-center")}>{label}</Label>
      </Reveal>
      <Reveal as="h2" delay={0.06} className={cn("h-section mt-[18px] mb-5 max-w-[20ch]", center && "mx-auto")}>
        {title}
      </Reveal>
      {sub && (
        <Reveal as="p" delay={0.12} className={cn("max-w-[52ch] text-mute", center && "mx-auto")}>
          {sub}
        </Reveal>
      )}
    </div>
  );
}
