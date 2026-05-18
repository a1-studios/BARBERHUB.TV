create table if not exists public.seo_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  path text,
  city_slug text,
  service_slug text,
  referrer text,
  user_id uuid,
  session_id text,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.seo_events enable row level security;

drop policy if exists "anyone can insert seo events" on public.seo_events;
create policy "anyone can insert seo events"
  on public.seo_events for insert
  to anon, authenticated
  with check (true);

drop policy if exists "sovereign can read seo events" on public.seo_events;
create policy "sovereign can read seo events"
  on public.seo_events for select
  to authenticated
  using (public.has_role(auth.uid(), 'sovereign'::app_role));

create index if not exists seo_events_created_idx on public.seo_events(created_at desc);
create index if not exists seo_events_path_idx on public.seo_events(path);
create index if not exists seo_events_city_idx on public.seo_events(city_slug);

-- Seed dev_mode default OFF for production safety
insert into public.platform_state (key, value)
values ('dev_mode', 'false')
on conflict (key) do nothing;