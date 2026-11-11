# Supabase — leads

The contact form (`/#contato`) and the demo pages POST to `/api/lead`, which stores each lead in the `public.leads` table using the **service role key on the server only**.

## Setup

1. Create a project at [supabase.com](https://supabase.com) (region close to your users, e.g. São Paulo).
2. Open **SQL Editor**, paste `supabase/migrations/0001_leads.sql` and run it. (With the Supabase CLI: `supabase db push`.)
3. In **Project Settings → API**, copy the **Project URL** and the **service_role** key.
4. Put them in `.env.local` (see `.env.example`) and restart `next dev`:

   ```bash
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

5. On Vercel: **Project → Settings → Environment Variables**, add the same two variables (Production and Preview), then redeploy. Never prefix them with `NEXT_PUBLIC_`.

Without these variables the endpoint logs the lead to the server console in development (`{ ok: true, stored: false }`) and answers `503 not_configured` in production.

## Test

```bash
curl -i -X POST http://localhost:3000/api/lead \
  -H 'content-type: application/json' \
  -d '{"source":"site","name":"Teste","contact":"teste@exemplo.com","interests":["Site"],"message":"Olá","company":""}'
```

Expect `200 {"ok":true,"stored":true}` and a new row in **Table Editor → leads**.

## Notes

- RLS is enabled with no policies: the public `anon` key cannot read or write leads.
- Rate limiting is not done in the app — configure a Vercel Firewall rule (or Upstash) for `POST /api/lead`.
