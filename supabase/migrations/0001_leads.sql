-- Leads from the site's contact form and the demo pages.
-- Written only by the server (/api/lead) with the service role key.

create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  source      text not null,
  name        text not null,
  contact     text not null,
  interests   text[],
  interest    text,
  message     text,
  user_agent  text,
  referer     text
);

-- RLS on with NO policies: the anon/authenticated roles can neither read nor write.
-- Only the service role (which bypasses RLS) touches this table.
alter table public.leads enable row level security;

create index if not exists leads_created_at_idx on public.leads (created_at desc);
