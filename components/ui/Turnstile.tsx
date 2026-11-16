"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile, browser side. Renders nothing visible unless Cloudflare wants an
 * interaction ("interaction-only"), then a small checkbox appears where `slot` sits.
 * Off (no script, no slot) until NEXT_PUBLIC_TURNSTILE_SITE_KEY exists at build time.
 *
 *   const human = useTurnstile("dark");
 *   body: JSON.stringify({ ..., turnstileToken: await human.take() })
 *   <form>… {human.slot}</form>
 *
 * `take()` waits (up to 10 s) for a token, hands it over and resets the widget, since a token
 * works once; the next submit gets a fresh one.
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
  const el = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const token = useRef<string | null>(null);
  const waiting = useRef<((t: string | undefined) => void)[]>([]);

  const settle = (t: string | undefined) => {
    for (const resolve of waiting.current.splice(0)) resolve(t);
  };

  useEffect(() => {
    if (!SITE_KEY || !el.current) return;
    let alive = true;
    loadTurnstile()
      .then((api) => {
        if (!alive || !el.current) return;
        widget.current = api.render(el.current, {
          sitekey: SITE_KEY,
          theme,
          size: "flexible",
          appearance: "interaction-only",
          callback: (t: string) => {
            token.current = t;
            settle(t);
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
    };
  }, [theme]);

  const take = useCallback(async (): Promise<string | undefined> => {
    if (!SITE_KEY) return undefined;
    const t =
      token.current ??
      (await new Promise<string | undefined>((resolve) => {
        waiting.current.push(resolve);
        setTimeout(() => resolve(undefined), 10_000);
      }));
    token.current = null;
    if (widget.current) window.turnstile?.reset(widget.current);
    return t;
  }, []);

  const slot = SITE_KEY ? <div ref={el} className="empty:hidden [&:has(iframe)]:mt-1" /> : null;
  return { take, slot };
}
