
-- 1) Enforce: Only barbers can create battles
drop policy if exists "Users can create battles" on public.battles;

create policy "Only barbers can create battles"
on public.battles
for insert
to authenticated
with check (
  auth.uid() = organizer_id
  and exists (
    select 1 from public.profiles pr
    where pr.user_id = auth.uid()
      and pr.user_type = 'barber'
  )
);

-- Keep existing SELECT/UPDATE/DELETE policies as-is

-- 2) Enforce: Only barbers can join as participants
drop policy if exists "Users can join battles (their own row)" on public.battle_participants;

create policy "Only barbers can join battles"
on public.battle_participants
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.profiles pr
    where pr.user_id = auth.uid()
      and pr.user_type = 'barber'
  )
);

-- Keep existing SELECT and DELETE (own row) policies as-is

-- 3) Enforce: Only barber participants can submit entries
drop policy if exists "Participants can create submissions" on public.battle_submissions;

create policy "Barber participants can create submissions"
on public.battle_submissions
for insert
to authenticated
with check (
  -- Must be the owner
  auth.uid() = user_id
  -- Must be a participant in the same battle
  and exists (
    select 1 from public.battle_participants p
    where p.battle_id = battle_submissions.battle_id
      and p.user_id = auth.uid()
  )
  -- Must be a barber
  and exists (
    select 1 from public.profiles pr
    where pr.user_id = auth.uid()
      and pr.user_type = 'barber'
  )
);

-- Keep existing SELECT/UPDATE/DELETE policies as-is

-- 4) Ensure: One vote per user per battle (already supports weighted tally elsewhere)
create unique index if not exists battle_votes_unique_voter_per_battle
  on public.battle_votes (voter_id, battle_id);

-- 5) Public, safe profile accessor for UI (used in BattleDetails, etc.)
create or replace function public.get_public_profile_info(profile_user_id uuid)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  user_type text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.user_id, p.display_name, p.avatar_url, p.user_type
  from public.profiles p
  where p.user_id = profile_user_id
$$;

grant execute on function public.get_public_profile_info(uuid) to anon, authenticated;
