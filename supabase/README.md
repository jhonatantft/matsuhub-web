# Supabase — leads

The contact form (`/#contato`) and the demo pages POST to `/api/lead`, which stores each lead in the `public.leads` table using the **service role key on the server only**.

## Setup

1. Create a project at [supabase.com](https://supabase.com) (region close to your users, e.g. São Paulo).
2. Open **SQL Editor**, paste `supabase/migrations/0001_leads.sql` and run it, then `supabase/migrations/0002_leads_guard.sql` (adds `ip_hash` + index for the per-IP limit). (With the Supabase CLI: `supabase db push`.)
3. In **Project Settings → API**, copy the **Project URL** and the **service_role** key.
4. Put them in `.env.local` (see `.env.example`) and restart `next dev`:

   ```bash
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

5. On Vercel: **Project → Settings → Environment Variables**, add the same two variables (Production and Preview), then redeploy. Never prefix them with `NEXT_PUBLIC_`.

Without these variables the endpoint logs the lead to the server console in development (`{ ok: true, stored: false }`) and answers `503 not_configured` in production.

## New-lead e-mail (Resend)

Each stored lead also sends an e-mail, after the response, so you hear about it right away:

1. Create an account at [resend.com](https://resend.com) and an API key (**API Keys → Create**, permission "Sending access").
2. On Vercel add `RESEND_API_KEY` and `LEAD_NOTIFY_TO` (the e-mail of your Resend account), then redeploy.
3. Optional: verify `matsuhub.com` in Resend (**Domains**, a few DNS records) and set `LEAD_NOTIFY_FROM=MatsuHub <leads@matsuhub.com>`; only then can `LEAD_NOTIFY_TO` be any address.

The e-mail has the name, contact (a WhatsApp link for phone numbers), interest, page and message; "Reply" answers the lead when the contact is an e-mail. If Supabase is not configured, the e-mail alone is the record: it is sent before answering and the form shows an error if it fails.

## Test

```bash
curl -i -X POST http://localhost:3000/api/lead \
  -H 'content-type: application/json' \
  -d '{"source":"site","name":"Teste","contact":"teste@exemplo.com","interests":["Site"],"message":"Olá","company":""}'
```

Expect `200 {"ok":true,"stored":true}` and a new row in **Table Editor → leads** (with `ip_hash` filled once 0002 ran). Without an `Origin` header curl counts as a non-browser client, so `elapsedMs` is optional; a request with `-H 'origin: http://localhost:3000'` must also send `"elapsedMs": 5000` or it is silently dropped. Sending the same contact + message again within 10 minutes answers `200 {"ok":true}` and stores nothing.

## Notes

- RLS is enabled with no policies: the public `anon` key cannot read or write leads.
- `ip_hash` is an HMAC-SHA256 of the client IP (IPv6: its /64) keyed with `IP_HASH_SECRET` (fallback: the service role key). The raw IP is never stored. `/api/lead` counts the recent rows per `ip_hash` as a durable per-IP limit (6 per 10 min, 30 per day) on top of the app rate limiter; see `docs/security.md`.
- Optional retention: `delete from public.leads where ...` is up to you; to drop only the hashes after a while, `update public.leads set ip_hash = null where created_at < now() - interval '30 days';`.
