import Link from "next/link";
import { cn } from "@/lib/cn";

type ButtonProps = {
  /** Renders a link when set: internal routes use next/link, hashes and external URLs a plain anchor. */
  href?: string;
  variant?: "primary" | "ghost";
  size?: "md" | "sm";
  /** Trailing arrow glyph, or false for none. */
  arrow?: "→" | "↓" | "↗" | false;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  target?: string;
  rel?: string;
  "aria-label"?: string;
};

export function Button({
  href,
  variant = "primary",
  size = "md",
  arrow = "→",
  className,
  children,
  type = "button",
  onClick,
  disabled,
  target,
  rel,
  "aria-label": ariaLabel,
}: ButtonProps) {
  const cls = cn("btn", variant === "primary" ? "btn-primary" : "btn-ghost", size === "sm" && "btn-sm", className);
  const inner = (
    <>
      {children}
      {arrow && (
        <span aria-hidden className="btn-arrow">
          {arrow}
        </span>
      )}
    </>
  );

  if (href) {
    const internalRoute = href.startsWith("/") && !href.includes("#");
    return internalRoute ? (
      <Link href={href} className={cls} onClick={onClick} aria-label={ariaLabel}>
        {inner}
      </Link>
    ) : (
      <a href={href} className={cls} onClick={onClick} target={target} rel={rel} aria-label={ariaLabel}>
        {inner}
      </a>
    );
  }
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {inner}
    </button>
  );
}
