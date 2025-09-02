
-- Helper function to check if a user is a barber
create or replace function public.is_barber(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = _user_id
      and p.user_type = 'barber'
  );
$$;

-- Optional: index for faster role checks
do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'idx_profiles_user_type'
  ) then
    create index idx_profiles_user_type on public.profiles(user_type);
  end if;
end$$;

-- BATTLES: restrict create to barbers
drop policy if exists "Users can create battles" on public.battles;
create policy "Barbers can create battles"
  on public.battles
  for insert
  with check (
    auth.uid() = organizer_id
    and public.is_barber(auth.uid())
  );

-- Keep select/update/delete as-is (organizer controls their own battles)
-- (No change needed to "Authenticated users can view battles", "Organizers can update", "Organizers can delete")

-- PARTICIPANTS: restrict join to barbers
drop policy if exists "Users can join battles (their own row)" on public.battle_participants;
create policy "Barbers can join battles"
  on public.battle_participants
  for insert
  with check (
    auth.uid() = user_id
    and public.is_barber(auth.uid())
  );

-- SUBMISSIONS: restrict submit to barber participants
drop policy if exists "Participants can create submissions" on public.battle_submissions;
create policy "Barber participants can create submissions"
  on public.battle_submissions
  for insert
  with check (
    auth.uid() = user_id
    and public.is_barber(auth.uid())
    and exists (
      select 1 from public.battle_participants p
      where p.battle_id = battle_id
        and p.user_id = auth.uid()
    )
  );

-- VOTES: keep as-is (any authenticated user)
-- If you'd like voting to be fans-only, we can replace the policy with:
-- with check (auth.uid() = voter_id and exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.user_type = 'fan'));
