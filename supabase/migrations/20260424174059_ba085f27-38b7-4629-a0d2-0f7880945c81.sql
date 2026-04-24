-- Pre-battle prediction picks (fan "projected winner" votes shown in the lobby).
-- Strictly separate from public.battle_votes (post-battle, weighted, status-gated).
create table if not exists public.battle_predictions (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles(id) on delete cascade,
  user_id uuid not null,
  picked_barber_id uuid not null,
  created_at timestamptz not null default now(),
  unique (battle_id, user_id)
);

create index if not exists battle_predictions_battle_idx on public.battle_predictions(battle_id);

alter table public.battle_predictions enable row level security;

drop policy if exists "anyone reads predictions" on public.battle_predictions;
create policy "anyone reads predictions"
  on public.battle_predictions for select
  using (true);

drop policy if exists "auth users insert own prediction" on public.battle_predictions;
create policy "auth users insert own prediction"
  on public.battle_predictions for insert
  with check (auth.uid() = user_id);

drop policy if exists "users update own prediction" on public.battle_predictions;
create policy "users update own prediction"
  on public.battle_predictions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);