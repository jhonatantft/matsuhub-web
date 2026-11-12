-- Abuse protection for /api/lead (see docs/security.md).
-- ip_hash = HMAC-SHA256 of the caller's IP (IPv6: its /64 prefix) keyed with the server secret
-- IP_HASH_SECRET (falls back to SUPABASE_SERVICE_ROLE_KEY). The raw IP is never stored.
-- /api/lead counts recent rows per ip_hash as a durable per-IP limit and duplicate check.

alter table public.leads add column if not exists ip_hash text;

comment on column public.leads.ip_hash is
  'HMAC-SHA256(client IP or IPv6 /64, IP_HASH_SECRET), hex. One-way; used only for per-IP limits.';

create index if not exists leads_ip_hash_created_at_idx on public.leads (ip_hash, created_at desc);
