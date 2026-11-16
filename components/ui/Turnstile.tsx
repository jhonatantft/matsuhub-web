"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile, browser side. Renders nothing visible unless Cloudflare wants an
 * interaction ("interaction-only"), then a small checkbox appears where `slot` sits.
 * Off (no script, no slot) until NEXT_PUBLIC_TURNSTILE_SITE_KEY exists at build time.
 *
 *   const human = useTurnstile("dark");
 *   const turnstileToken = await human.take();
 *   if (turnstileToken === null) return showTickTheBoxMessage();
 *   body: JSON.stringify({ ..., turnstileToken })
 *   <form>… {human.slot} (above the submit button)</form>
 *
 * `take()` waits (up to 10 s) for a token, hands it over and resets the widget, since a token
 * works once; the next submit gets a fresh one. It answers `null` at once, and scrolls the box
 * into view, when Cloudflare shows the check box and it is not ticked yet: nothing should be sent
 * then. `undefined` means Turnstile is off or unavailable; send anyway and let the server decide.
 */

type Theme = "dark" | "light" | "auto";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let loading: Promise<TurnstileApi> | null = null;
function loadTurnstile(): Promise<TurnstileApi> {
  loading ??= new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile")));
    s.onerror = () => {
      loading = null;
      reject(new Error("turnstile"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

export function useTurnstile(theme: Theme = "dark") {
  // The slot may mount later than the form (a wizard's last step), so render whenever it appears.
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const el = useRef<HTMLDivElement | null>(null);
  const attach = useCallback((n: HTMLDivElement | null) => {
    el.current = n;
    setNode(n);
  }, []);
  const widget = useRef<string | null>(null);
  const token = useRef<string | null>(null);
  const interactive = useRef(false);
  const waiting = useRef<((t: string | null | undefined) => void)[]>([]);

  const settle = (t: string | null | undefined) => {
    for (const resolve of waiting.current.splice(0)) resolve(t);
  };

  useEffect(() => {
    if (!SITE_KEY || !node) return;
    let alive = true;
    loadTurnstile()
      .then((api) => {
        if (!alive) return;
        widget.current = api.render(node, {
          sitekey: SITE_KEY,
          theme,
          size: "flexible",
          appearance: "interaction-only",
          callback: (t: string) => {
            token.current = t;
            interactive.current = false;
            settle(t);
          },
          // the check box is showing and waits for a tick: a pending submit must not hang on it
          "before-interactive-callback": () => {
            interactive.current = true;
            settle(null);
          },
          "after-interactive-callback": () => {
            interactive.current = false;
          },
          "expired-callback": () => {
            token.current = null;
          },
          "error-callback": () => {
            token.current = null;
            settle(undefined);
          },
        });
      })
      .catch(() => settle(undefined));
    return () => {
      alive = false;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
      token.current = null;
      interactive.current = false;
    };
  }, [theme, node]);

  const take = useCallback(async (): Promise<string | null | undefined> => {
    if (!SITE_KEY) return undefined;
    const t =
      token.current ??
      (interactive.current
        ? null
        : await new Promise<string | null | undefined>((resolve) => {
            waiting.current.push(resolve);
            setTimeout(() => resolve(undefined), 10_000);
          }));
    if (t === null) {
      el.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      return null;
    }
    token.current = null;
    if (widget.current) window.turnstile?.reset(widget.current);
    return t;
  }, []);

  const slot = SITE_KEY ? <div ref={attach} className="empty:hidden [&:has(iframe)]:mt-1" /> : null;
  return { take, slot };
}
