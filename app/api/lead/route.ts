import { z } from "zod";
import { INTERESTS, LIMITS, isValidContact } from "@/components/home/parts-b/leadRules";
import { supabaseAdmin, type LeadRow } from "@/lib/supabase/server";

/**
 * POST /api/lead — stores a lead from the contact form ("site") or a demo page ("demo-imobiliaria").
 *
 *   site:             { source, name, contact, interests: string[], message, company }
 *   demo-imobiliaria / demo-restaurante: { source, name, contact, interest?: string, message, company }
 *
 * `company` is a honeypot: when filled we answer 200 and store nothing.
 *
 * Rate limiting belongs at the edge, not in this function's memory (instances are short-lived
 * and many): add a Vercel Firewall rate-limit rule for POST /api/lead, or Upstash Ratelimit here.
 */

const MAX_BYTES = 10 * 1024;

const trimmed = (max: number) => z.string().trim().max(max);

const base = {
  name: trimmed(LIMITS.nameMax).min(LIMITS.nameMin),
  contact: trimmed(LIMITS.contactMax).min(LIMITS.contactMin).refine(isValidContact, "invalid_contact"),
  message: trimmed(LIMITS.messageMax).optional(),
  company: z.string().max(500).optional(),
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
    source: z.literal(["demo-imobiliaria", "demo-restaurante"]),
    ...base,
    interest: trimmed(120).optional(),
  }),
]);

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

/** Reads at most MAX_BYTES of the body; null when it is larger. */
async function readCapped(req: Request): Promise<string | null> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BYTES) return null;
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
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

export async function POST(req: Request) {
  // Compare the media type essence only: "text/plain; x=application/json" is a CORS-simple
  // type, so a substring match would let any site post here without a preflight.
  const type = (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (type !== "application/json") {
    return json({ ok: false, error: "unsupported_media_type" }, 415);
  }

  const text = await readCapped(req);
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

  // Honeypot: bots fill every field. Pretend success, store nothing.
  const hp = (raw as { company?: unknown }).company;
  if (typeof hp === "string" ? hp.trim() !== "" : hp != null && hp !== false) {
    return json({ ok: true });
  }

  const parsed = LeadSchema.safeParse(raw);
  if (!parsed.success) {
    const fields = Array.from(new Set(parsed.error.issues.map((i) => String(i.path[0] ?? "body"))));
    return json({ ok: false, error: "invalid", fields }, 422);
  }
  const lead = parsed.data;

  const row: LeadRow = {
    source: lead.source,
    name: lead.name,
    contact: lead.contact,
    interests: lead.source === "site" ? lead.interests : null,
    interest: lead.source !== "site" ? lead.interest || null : null,
    message: lead.message || null,
    user_agent: req.headers.get("user-agent")?.slice(0, 400) ?? null,
    referer: req.headers.get("referer")?.slice(0, 400) ?? null,
  };

  const db = supabaseAdmin();
  if (!db) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[api/lead] Supabase não configurado — lead não armazenado:", row);
      return json({ ok: true, stored: false });
    }
    console.error("[api/lead] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes");
    return json({ ok: false, error: "not_configured" }, 503);
  }

  try {
    const { error } = await db.from("leads").insert(row);
    if (error) {
      console.error("[api/lead] insert failed:", error.message);
      return json({ ok: false, error: "storage_failed" }, 500);
    }
  } catch (err) {
    console.error("[api/lead] insert threw:", err);
    return json({ ok: false, error: "storage_failed" }, 500);
  }

  return json({ ok: true, stored: true });
}
