# Security — abuse protection for the public endpoints

What the site exposes without login, how each endpoint is protected, every limit, and what the owner has to set up. Code: `lib/guard/**` (server-only), `app/api/lead/route.ts`, `app/api/mcp/route.ts`. No CAPTCHA anywhere: people never see a challenge from the app.

## Layers

1. **Vercel Firewall** (outer, at the edge, before any function runs). A rate-limit rule you create in the dashboard — steps below. Blocked traffic costs no function time.
2. **The app** (inner, per endpoint): same-origin check, per-IP rate limits, honeypot, time-to-fill, content heuristics, duplicate guard, and a durable per-IP limit in Supabase.

## Client IP

`lib/guard/ip.ts` reads `x-vercel-forwarded-for`, then `x-real-ip`, then the first entry of `x-forwarded-for`. On Vercel these are set by the edge and client-supplied values are overwritten ("we currently overwrite the X-Forwarded-For header and do not forward external IPs" — Vercel request-headers docs); `x-vercel-forwarded-for` comes first because a proxy placed in front of Vercel could rewrite `x-forwarded-for`. Locally they are client-controlled — fine for development, not a boundary.

IPv4 addresses are counted one by one; IPv6 by **/64 prefix** (an ISP customer usually owns a whole /64). The IP is never stored or logged: limiter keys, the `ip_hash` column and log lines use `HMAC-SHA256(ip, IP_HASH_SECRET)` (log lines show only its first 10 hex chars).

## Rate limiter

`lib/guard/limiter.ts`, one API with two backends:

| Backend | When | Guarantee |
|---|---|---|
| Upstash Redis / Vercel KV over REST | `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`, or `KV_REST_API_URL` + `KV_REST_API_TOKEN` | **Shared** by every instance and region. One `/pipeline` call (INCR + EXPIRE + GET) per check, 800 ms timeout. |
| In-memory `Map` (bounded, 5 000 keys, LRU eviction) | no store configured, or the store failed | **Best-effort.** Each serverless instance has its own counters and instances are many and short-lived, so a client spread over instances gets more than the limit. |

Algorithm: sliding-window counter (current window + weighted previous window), so there is no 2× burst at window edges. Requests that were rejected still count, so a client that keeps hammering stays blocked. **Fails open:** if the store times out or errors, the request is judged by the in-memory counters and the store is skipped for 30 s; an outage never blocks visitors.

## POST /api/lead

Callers: the contact form (`components/home/parts-b/LeadForm.tsx`, source `site`) and the demo forms (`demo-imobiliaria` in `components/aurora/site/SiteVisit.tsx`, `demo-restaurante` in `components/mare/site/SiteReserve.tsx`, `demo-clinica`). The contract for new forms is the comment at the top of `app/api/lead/route.ts`.

Checks, in order:

| # | Check | Limit / rule | Answer |
|---|---|---|---|
| 1 | Content type | `application/json` (essence only) | 415 `unsupported_media_type` |
| 2 | Size | 10 KB (declared and streamed) | 413 `payload_too_large` |
| 3 | Same origin (`lib/guard/origin.ts`) | `Origin` must be ours and not `Sec-Fetch-Site: cross-site`. Without `Origin`, the request passes only if `Sec-Fetch-Site` is absent too (non-browser clients); a `Referer`, if any, must then be ours. `Origin: null` is rejected. | 403 `forbidden` |
| 4 | Rate limit per IP (/64) | **6 per 10 min and 30 per day** | 429 `rate_limited` + `Retry-After` + `message: "Muitas tentativas seguidas. Tente de novo em alguns minutos."` |
| 5 | JSON | object body | 400 `invalid_json` |
| 6 | Honeypot | hidden `company` field filled | 200 `{ ok: true }`, nothing stored |
| 7 | Time to fill | `elapsedMs` < 2 500, or missing on a browser request (has `Origin`) | 200 `{ ok: true }`, nothing stored |
| 8 | Schema (zod) | as before; `elapsedMs` optional number | 422 `invalid` + `fields` |
| 9 | Content | > 2 links in the message (`http(s)://`, `www.`, `[url`, `<a `), any link in the name, or the same text repeated (whole message is one chunk ×3+, a line/sentence ×3+, or 15+ words with < 30 % distinct) | 200 `{ ok: true }`, nothing stored |
| 10 | Duplicate | same contact + same message (case/space-insensitive) within **10 min**, from anywhere — Redis/memory claim, released if storing fails | 200 `{ ok: true }`, not stored again |
| 11 | Durable per-IP limit (Supabase only) | stored rows with this `ip_hash`: **6 per 10 min, 30 per day**; also a duplicate check on those rows. 1.5 s timeout, fails open. | 429 as in #4 / 200 duplicate |
| 12 | Insert | — | 200 `{ ok: true, stored: true }` (dev without Supabase: `stored: false`; production without Supabase: 503 `not_configured`) |

Why 6 / 10 min and 30 / day: a prospect may try the contact form and each demo form in one visit (4–5 posts), and offices or universities share one IP. Spam beyond that is caught by the silent filters, which don't count against the visitor.

"Silent" drops (6, 7, 9, 10) answer exactly like the honeypot so a bot cannot tell it was filtered; each one writes one log line with the reason, source and IP tag — never the contact, message or IP.

Time to fill: the forms start a clock (`performance.now()`) when the form first scrolls into view (IntersectionObserver) or gets focus, whichever comes first, and send `elapsedMs` on submit. People need far more than 2.5 s to type a name and a contact.

## POST /api/mcp (Pulso demo store, MCP Streamable HTTP)

Existing: Origin validation (403), `application/json` (415), 64 KB cap (413), JSON-RPC and input validation. Added, per IP (/64), sliding window — the MCP tools spec says servers **MUST** "Rate limit tool invocations":

| Scope | Limit |
|---|---|
| Every POST (counted before validation, so floods of bad requests count too) | **120 per minute** |
| `tools/call` of `create_checkout`, `update_checkout`, `complete_checkout`, `cancel_checkout` | **20 per minute** (in addition) |

Over a limit: **HTTP 429**, `Retry-After: <s>`, and a JSON-RPC error `{ code: -31429, message, data: { retryAfterSeconds, scope } }` that echoes the request `id` when the body had a valid one (no `id` for notifications or unparseable bodies, as the JSON-RPC/MCP rules allow). The MCP 2026-07-28 spec defines no rate-limit code, reserves -32020…-32099 for itself, discourages -32000…-32019, and says new codes SHOULD be outside JSON-RPC's -32768…-32000 — hence -31429. GET/DELETE still answer 405.

Caveat: hosted agents (ChatGPT, Claude…) call from their providers' servers, so many users can share one IP. For a demo store 120/min is ample; raise `ALL` in `app/api/mcp/route.ts` if real traffic needs it.

## GET /.well-known/ucp, /llms.txt, /api/mcp/agent-profile

Not rate limited in the app: they are cheap, cacheable responses with no side effects. Vercel's always-on DDoS mitigation covers volumetric floods; add a Firewall rule only if the logs show abuse.

## Environment variables

| Variable | Needed | What |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_URL` + `KV_REST_API_TOKEN`) | recommended | Makes the app limits and the duplicate guard shared across instances. Without it they are per-instance (best-effort). |
| `IP_HASH_SECRET` | recommended | Key of the IP HMAC (`openssl rand -hex 32`). Falls back to `SUPABASE_SERVICE_ROLE_KEY`, then the KV token, then a random per-process value. Changing it restarts every per-IP history. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | to store leads | Also enable the durable per-IP limit. |

All server-only; never prefix them with `NEXT_PUBLIC_`.

## What is durable and what is best-effort

| Protection | Durable? |
|---|---|
| Vercel Firewall rule | Yes (edge; counters are per region) |
| Same-origin, content type, size, honeypot, time to fill, content heuristics | Yes (stateless) |
| App rate limits and duplicate guard **with** Upstash/KV | Yes (shared store; fail open on outage) |
| App rate limits and duplicate guard **without** Upstash/KV | Best-effort (per instance) |
| Supabase per-IP limit and duplicate check | Yes (counts stored rows; fail open on error) |

## Owner setup

### 1. Supabase migration

In Supabase **SQL Editor**, run `supabase/migrations/0002_leads_guard.sql` (after `0001_leads.sql`). It adds `ip_hash` and an index on `(ip_hash, created_at desc)`. Until it runs, `/api/lead` still stores leads (without `ip_hash`) and logs a reminder.

### 2. Environment variables on Vercel

**Project → Settings → Environment Variables**, for Production and Preview:

- `IP_HASH_SECRET` = output of `openssl rand -hex 32` (mark it Sensitive).
- Upstash: **Storage** (or **Marketplace**) → **Upstash** → **Redis** → create a free database in a region close to the functions → **Connect Project**. The integration adds the `KV_REST_API_*` / `UPSTASH_REDIS_REST_*` variables itself.

Redeploy after adding variables.

### 3. Vercel Firewall rate-limit rule (outer layer)

From Vercel's docs (WAF Rate Limiting, WAF Custom Rules): rate limiting is available on all plans; **Hobby gets 1 rate-limit rule per project, within a total of 3 custom rules**, fixed-window only, window 10 s–10 min, keys IP or JA4 digest, 1,000,000 allowed requests included. Rate-limit rules cannot be defined in `vercel.json` (its `routes[].mitigate` supports only `deny` and `challenge`); use the dashboard (or `vercel firewall rules add` in the CLI). Changes apply immediately, no redeploy.

Because Hobby allows a single rate-limit rule, use one rule for both endpoints, set above the app's own limits so it only cuts real floods:

1. Vercel dashboard → select the project → **Firewall** in the sidebar.
2. **Configure** at the top right (newer UI: **⋯** → **Configure**), then **+ New Rule** (newer UI: **Add New…** → **Rule**).
3. Name: `API POST flood`.
4. In **Configure**, add the **If** conditions, joined with **AND**:
   - **Request Path** · **Starts with** · `/api/`
   - **Method** · **Equals** · `POST`
5. **Then** → **Log** first (Vercel's recommended practice). **Save Rule** → **Review Changes** → **Publish**.
6. Watch the Firewall overview (pick the rule in the traffic grouping drop-down) for a while — normal visitors should be far below the limit.
7. Edit the rule: **Then** → **Rate Limit** (accept the **Rate Limiting Pricing** dialog with **Continue** the first time) → **Fixed Window** → **Time Window** `60s` → **Request Limit** `150` → key **IP** → action **Too Many Requests (429)**. **Save Rule** → **Review Changes** → **Publish**.

Why 150 / 60 s / IP: above the app's MCP limit (120/min), so normal agents get the app's JSON-RPC 429 with a useful body, while scripted floods against `/api/lead` or `/api/mcp` are cut at the edge before invoking a function. Firewall-mitigated requests do not count as CDN requests or data transfer. Natural-language alternative in the rule form: "Rate limit POST requests whose path starts with /api/ to 150 per minute per IP".

The two remaining custom rules (deny/challenge/log, free) are left for incidents — for example, a **Deny** on an abusive IP or ASN seen in the Firewall overview.

## Sources

- https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting
- https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules
- https://vercel.com/docs/vercel-firewall/vercel-waf/rule-configuration
- https://vercel.com/docs/vercel-firewall/vercel-waf/usage-and-pricing
- https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting-sdk (`@vercel/firewall`, not used: new dependency)
- https://vercel.com/changelog/manage-vercel-firewall-in-the-cli
- https://vercel.com/docs/headers/request-headers
- https://upstash.com/docs/redis/features/restapi
- https://modelcontextprotocol.io/specification/2026-07-28/server/tools (Security Considerations)
- https://modelcontextprotocol.io/specification/2026-07-28/basic/index (Error Codes)
- https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http
