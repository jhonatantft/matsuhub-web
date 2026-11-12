import { z } from "zod";
import { INTERESTS, LIMITS, RATE_LIMITED_MESSAGE, isValidContact } from "@/components/home/parts-b/leadRules";
import { clientIp, hashIp, hashText, logTag } from "@/lib/guard/ip";
import { claimOnce, rateLimit, release, type Rule } from "@/lib/guard/limiter";
import { checkSameOrigin } from "@/lib/guard/origin";
import { supabaseAdmin, type LeadRow } from "@/lib/supabase/server";

/**
 * POST /api/lead — stores a lead from the contact form ("site") or a demo page.
 *
 * ── Contract for every form that posts here ──────────────────────────────────────────────
 *   site:             { source, name, contact, interests: string[], message, company, elapsedMs }
 *   demo-imobiliaria / demo-restaurante / demo-clinica:
 *                     { source, name, contact, interest?: string, message, company, elapsedMs }
 *
 *   - Post from the page itself (same origin), `content-type: application/json`, ≤ 10 KB.
 *   - `company`: hidden honeypot input, always sent, empty for people.
 *   - `elapsedMs`: number, milliseconds since the form became visible or the first interaction,
 *     measured in handlers/effects (performance.now()), never during render. A browser post
 *     WITHOUT it, or under 2.5 s, is treated as a bot: 200 { ok: true } and nothing is stored.
 *   - Success is `res.ok && body.ok`. On 429 show RATE_LIMITED_MESSAGE from leadRules
 *     ("Muitas tentativas seguidas. Tente de novo em alguns minutos."); `Retry-After` has seconds.
 *   - 422 { error: "invalid", fields } names the fields the server rejected.
 * ─────────────────────────────────────────────────────────────────────────────────────────
 *
 * Checks, in order (docs/security.md has the why and every limit):
 *   415 content-type · 413 size → 403 cross-site → 429 per-IP limits → 400 JSON → honeypot,
 *   time-to-fill, content heuristics (silent 200) → 422 schema → duplicate (silent 200) →
 *   Supabase: durable per-IP limit (429) and duplicate (silent 200) → insert.
 * "Silent 200" answers { ok: true } exactly like a stored lead minus `stored`, so bots learn nothing.
 */

const MAX_BYTES = 10 * 1024;
const MIN_FILL_MS = 2_500;
const DUP_WINDOW_SEC = 600;
const MAX_LINKS = 2;
/** Per IP (IPv6: per /64). Room for a visitor who tries the contact form and every demo. */
const LEAD_RULES: Rule[] = [
  { limit: 6, windowSec: 600 },
  { limit: 30, windowSec: 86_400 },
];

const trimmed = (max: number) => z.string().trim().max(max);

const base = {
  name: trimmed(LIMITS.nameMax).min(LIMITS.nameMin),
  contact: trimmed(LIMITS.contactMax).min(LIMITS.contactMin).refine(isValidContact, "invalid_contact"),
  message: trimmed(LIMITS.messageMax).optional(),
  company: z.string().max(500).optional(),
  elapsedMs: z.number().nonnegative().optional(),
};

const LeadSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("site"),
    ...base,
    interests: z
      .array(z.enum(INTERESTS))
      .max(LIMITS.interestsMax)
      .optional()
      .transform((v) => (v ? Array.from(new Set(v)) : [])),
  }),
  z.object({
    source: z.literal(["demo-imobiliaria", "demo-restaurante", "demo-clinica"]),
    ...base,
    interest: trimmed(120).optional(),
  }),
]);

const NO_STORE = { "cache-control": "no-store" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE });

const tooMany = (retryAfter: number) =>
  Response.json(
    { ok: false, error: "rate_limited", message: RATE_LIMITED_MESSAGE, retryAfter },
    { status: 429, headers: { ...NO_STORE, "retry-after": String(retryAfter) } },
  );

/** One log line per blocked/dropped request: reason, source and a hash tag of the IP. No PII. */
function note(reason: string, tag: string, extra: Record<string, unknown> = {}) {
  console.info(`[api/lead] ${reason}`, JSON.stringify({ ip: tag, ...extra }));
}

/** Pretends success and stores nothing (honeypot, too fast, spammy, duplicate). */
function drop(reason: string, tag: string, extra: Record<string, unknown> = {}) {
  note(`descartado: ${reason}`, tag, extra);
  return json({ ok: true });
}

/** Reads at most MAX_BYTES of the body; null when it is larger. */
async function readCapped(req: Request): Promise<string | null> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let off = 0;
  for (const c of chunks) {
    all.set(c, off);
    off += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

/* ── content heuristics ── */

const LINK = /\bhttps?:\/\/|\bwww\.|\[url[=\]]|<a\s/gi;
const countLinks = (s: string) => s.match(LINK)?.length ?? 0;

/** The same text over and over: a whole-message period, a repeated line/sentence, or few distinct words. */
function isRepeated(text: string): boolean {
  const t = `${text.toLowerCase().replace(/\s+/g, " ").trim()} `;
  if (t.length < 13) return false;
  // smallest period of the whole string (KMP prefix function): "compre já compre já compre já "
  const n = t.length;
  const pi = new Int32Array(n);
  for (let i = 1, k = 0; i < n; i++) {
    while (k > 0 && t[i] !== t[k]) k = pi[k - 1];
    if (t[i] === t[k]) k++;
    pi[i] = k;
  }
  const period = n - pi[n - 1];
  if (period < n && n % period === 0 && n / period >= 3) return true;
  // one line or sentence (4+ chars) three or more times
  const seen = new Map<string, number>();
  for (const seg of text.toLowerCase().split(/[\n.!?]+/)) {
    const s = seg.replace(/\s+/g, " ").trim();
    if (s.length < 4) continue;
    const c = (seen.get(s) ?? 0) + 1;
    if (c >= 3) return true;
    seen.set(s, c);
  }
  // long text made of very few distinct words
  const words = t.split(" ").filter(Boolean);
  return words.length >= 15 && new Set(words).size / words.length < 0.3;
}

function spamReason(name: string, message: string): string | null {
  if (countLinks(message) > MAX_LINKS) return "links";
  if (countLinks(name) > 0) return "link-no-nome";
  if (isRepeated(message)) return "texto-repetido";
  return null;
}

/* ── Supabase: durable per-IP limit + duplicate, from the stored rows ── */

type Durable = { kind: "ok" } | { kind: "limited"; retryAfter: number } | { kind: "duplicate" };

async function durableCheck(
  db: NonNullable<ReturnType<typeof supabaseAdmin>>,
  ipHash: string,
  contact: string,
  message: string,
): Promise<Durable> {
  const now = Date.now();
  const longest = Math.max(...LEAD_RULES.map((r) => r.windowSec)) * 1000;
  const { data, error } = await db
    .from("leads")
    .select("created_at, contact, message")
    .eq("ip_hash", ipHash)
    .gte("created_at", new Date(now - longest).toISOString())
    .order("created_at", { ascending: false })
    .limit(Math.max(...LEAD_RULES.map((r) => r.limit)))
    .abortSignal(AbortSignal.timeout(1500));
  if (error || !data) {
    // fail open: a slow or missing table (migration 0002 not run) must not block real leads
    console.warn("[api/lead] durable check skipped:", error?.code ?? "no data", error?.message?.slice(0, 120) ?? "");
    return { kind: "ok" };
  }
  const rows = (data as { created_at: string; contact: string; message: string | null }[]).map((r) => ({
    t: Date.parse(r.created_at),
    contact: r.contact.toLowerCase(),
    message: r.message ?? "",
  }));
  const c = contact.toLowerCase();
  if (rows.some((r) => now - r.t < DUP_WINDOW_SEC * 1000 && r.contact === c && r.message === message)) {
    return { kind: "duplicate" };
  }
  let retryAfter = 0;
  for (const rule of LEAD_RULES) {
    const inWindow = rows.filter((r) => now - r.t < rule.windowSec * 1000);
    if (inWindow.length >= rule.limit) {
      const oldest = Math.min(...inWindow.map((r) => r.t));
      retryAfter = Math.max(retryAfter, Math.ceil((oldest + rule.windowSec * 1000 - now) / 1000));
    }
  }
  return retryAfter > 0 ? { kind: "limited", retryAfter } : { kind: "ok" };
}

export async function POST(req: Request) {
  // Compare the media type essence only: "text/plain; x=application/json" is a CORS-simple
  // type, so a substring match would let any site post here without a preflight.
  const type = (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (type !== "application/json") {
    return json({ ok: false, error: "unsupported_media_type" }, 415);
  }
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BYTES) return json({ ok: false, error: "payload_too_large" }, 413);

  const ip = clientIp(req);
  const ipHash = hashIp(ip);
  const tag = logTag(ipHash);

  const origin = checkSameOrigin(req);
  if (!origin.ok) {
    note("bloqueado: origem", tag, { why: origin.reason });
    return json({ ok: false, error: "forbidden" }, 403);
  }

  // Count the hit while the body streams in.
  const verdictP = rateLimit("lead", ipHash.slice(0, 32), LEAD_RULES);
  const text = await readCapped(req);
  const verdict = await verdictP;
  if (!verdict.ok) {
    note("bloqueado: rate limit", tag, { backend: verdict.backend, retryAfter: verdict.retryAfter });
    return tooMany(verdict.retryAfter);
  }
  if (text === null) return json({ ok: false, error: "payload_too_large" }, 413);

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return json({ ok: false, error: "invalid_json" }, 400);
  }
  const body = raw as { company?: unknown; elapsedMs?: unknown; source?: unknown };
  const source = typeof body.source === "string" ? body.source.slice(0, 40) : undefined;

  // Honeypot: bots fill every field. Pretend success, store nothing.
  const hp = body.company;
  if (typeof hp === "string" ? hp.trim() !== "" : hp != null && hp !== false) {
    return drop("honeypot", tag, { source });
  }

  // Time-to-fill: people need seconds to type a name and a contact; scripts need milliseconds.
  // Browser forms must send elapsedMs; non-browser callers (no Origin) may omit it.
  const elapsed = body.elapsedMs;
  if (typeof elapsed === "number" ? !(elapsed >= MIN_FILL_MS) : origin.browser) {
    return drop("preenchimento rápido", tag, { source, elapsedMs: typeof elapsed === "number" ? Math.round(elapsed) : null });
  }

  const parsed = LeadSchema.safeParse(raw);
  if (!parsed.success) {
    const fields = Array.from(new Set(parsed.error.issues.map((i) => String(i.path[0] ?? "body"))));
    return json({ ok: false, error: "invalid", fields }, 422);
  }
  const lead = parsed.data;
  const message = lead.message || "";

  const spam = spamReason(lead.name, message);
  if (spam) return drop(`conteúdo (${spam})`, tag, { source });

  // Duplicate: same contact + same message within 10 minutes, from anywhere.
  const dupKey = `lead:${hashText(`${lead.contact.toLowerCase()}\n${message.replace(/\s+/g, " ")}`)}`;
  if (!(await claimOnce(dupKey, DUP_WINDOW_SEC))) return drop("duplicado", tag, { source });

  const row: LeadRow & { ip_hash: string | null } = {
    source: lead.source,
    name: lead.name,
    contact: lead.contact,
    interests: lead.source === "site" ? lead.interests : null,
    interest: lead.source !== "site" ? lead.interest || null : null,
    message: lead.message || null,
    user_agent: req.headers.get("user-agent")?.slice(0, 400) ?? null,
    referer: req.headers.get("referer")?.slice(0, 400) ?? null,
    ip_hash: ip === "unknown" ? null : ipHash,
  };

  const db = supabaseAdmin();
  if (!db) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[api/lead] Supabase não configurado — lead não armazenado:", row);
      return json({ ok: true, stored: false });
    }
    await release(dupKey);
    console.error("[api/lead] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes");
    return json({ ok: false, error: "not_configured" }, 503);
  }

  if (row.ip_hash) {
    const durable = await durableCheck(db, row.ip_hash, lead.contact, lead.message || "");
    if (durable.kind === "duplicate") return drop("duplicado (banco)", tag, { source });
    if (durable.kind === "limited") {
      await release(dupKey);
      note("bloqueado: limite no banco", tag, { retryAfter: durable.retryAfter });
      return tooMany(durable.retryAfter);
    }
  }

  try {
    let { error } = await db.from("leads").insert(row);
    if (error && (error.code === "PGRST204" || error.message.includes("ip_hash"))) {
      // migration 0002 not applied yet: keep accepting leads, without the IP hash
      console.warn("[api/lead] coluna ip_hash ausente — rode supabase/migrations/0002_leads_guard.sql");
      const { ip_hash: _omit, ...legacy } = row;
      void _omit;
      ({ error } = await db.from("leads").insert(legacy));
    }
    if (error) {
      await release(dupKey);
      console.error("[api/lead] insert failed:", error.code, error.message.slice(0, 200));
      return json({ ok: false, error: "storage_failed" }, 500);
    }
  } catch (err) {
    await release(dupKey);
    console.error("[api/lead] insert threw:", err instanceof Error ? err.name : "error");
    return json({ ok: false, error: "storage_failed" }, 500);
  }

  return json({ ok: true, stored: true });
}
