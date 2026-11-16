/**
 * Cloudflare Turnstile, server side: proves a lead came from a real browser that passed the
 * (usually invisible) challenge. Off until TURNSTILE_SECRET_KEY is set; once on, every post to
 * /api/lead needs a fresh token, scripts included. Tokens are single use and live 5 minutes.
 *
 * Local testing: Cloudflare's test keys (always pass) —
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
 *   TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
 */

export const turnstileEnabled = () => Boolean(process.env.TURNSTILE_SECRET_KEY);

export type TurnstileVerdict = { ok: true } | { ok: false; reason: string };

export async function verifyTurnstile(token: unknown, ip: string): Promise<TurnstileVerdict> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true };
  if (typeof token !== "string" || !token || token.length > 2048) return { ok: false, reason: "sem-token" };
  const form = new URLSearchParams({ secret, response: token });
  if (ip !== "unknown") form.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    return data.success ? { ok: true } : { ok: false, reason: (data["error-codes"] ?? ["recusado"]).join(",") };
  } catch (err) {
    // Cloudflare unreachable: let the lead through (the other checks still apply) rather than lose it.
    console.warn("[turnstile] verificação indisponível:", err instanceof Error ? err.name : "error");
    return { ok: true };
  }
}
