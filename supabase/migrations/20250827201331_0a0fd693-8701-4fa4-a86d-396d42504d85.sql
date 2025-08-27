
-- Battles core table
create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null,
  title text not null,
  description text,
  category text,
  status text not null default 'upcoming', -- upcoming | active | voting | completed | cancelled
  prize_amount integer not null default 0,
  currency text not null default 'USD',
  cover_image_url text,
  rules text,
  max_participants integer,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  voting_ends_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.battles enable row level security;

-- Indexes to help filtering
create index if not exists battles_status_idx on public.battles (status);
create index if not exists battles_starts_at_idx on public.battles (starts_at);
create index if not exists battles_organizer_idx on public.battles (organizer_id);

-- Keep updated_at fresh
create trigger battles_set_updated_at
before update on public.battles
for each row execute procedure public.update_updated_at_column();

-- Validate battle dates (use a trigger instead of CHECKs to avoid immutability issues)
create or replace function public.validate_battle_dates()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.ends_at is not null and new.starts_at is not null and new.ends_at <= new.starts_at then
    raise exception 'ends_at must be after starts_at';
  end if;

  if new.voting_ends_at is not null and new.ends_at is not null and new.voting_ends_at <= new.ends_at then
    raise exception 'voting_ends_at must be after ends_at';
  end if;

  return new;
end;
$$;

create trigger battles_validate_dates
before insert or update on public.battles
for each row execute procedure public.validate_battle_dates();

-- RLS for battles
create policy "Authenticated users can view battles"
  on public.battles
  for select
  using (auth.uid() is not null);

create policy "Users can create battles"
  on public.battles
  for insert
  with check (auth.uid() = organizer_id);

create policy "Organizers can update their battles"
  on public.battles
  for update
  using (auth.uid() = organizer_id);

create policy "Organizers can delete their battles"
  on public.battles
  for delete
  using (auth.uid() = organizer_id);


-- Participants table
create table if not exists public.battle_participants (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles(id) on delete cascade,
  user_id uuid not null,
  joined_at timestamp with time zone not null default now(),
  status text not null default 'active',
  unique (battle_id, user_id)
);

alter table public.battle_participants enable row level security;

create index if not exists battle_participants_battle_idx on public.battle_participants (battle_id);
create index if not exists battle_participants_user_idx on public.battle_participants (user_id);

-- Prevent over-capacity and invalid-joining states
create or replace function public.validate_participant_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_max int;
  v_status text;
  v_current int;
begin
  select max_participants, status into v_max, v_status
  from public.battles
  where id = new.battle_id;

  -- Only allow join when battle exists and is 'upcoming' or 'active'
  if v_status is null or v_status not in ('upcoming','active') then
    raise exception 'Joining is not allowed at this time for this battle (status: %)', v_status;
  end if;

  if v_max is not null then
    select count(*) into v_current
    from public.battle_participants
    where battle_id = new.battle_id;

    if v_current >= v_max then
      raise exception 'Battle is full. Max participants: %', v_max;
    end if;
  end if;

  return new;
end;
$$;

create trigger battle_participants_validate
before insert on public.battle_participants
for each row execute procedure public.validate_participant_limit();

-- RLS for participants
create policy "Authenticated users can view participants"
  on public.battle_participants
  for select
  using (auth.uid() is not null);

create policy "Users can join battles (their own row)"
  on public.battle_participants
  for insert
  with check (auth.uid() = user_id);

create policy "Users can leave their participation"
  on public.battle_participants
  for delete
  using (auth.uid() = user_id);


-- Submissions table
create table if not exists public.battle_submissions (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles(id) on delete cascade,
  user_id uuid not null,
  media_url text not null,
  thumbnail_url text,
  title text,
  description text,
  status text not null default 'submitted',
  created_at timestamp with time zone not null default now(),
  unique (battle_id, user_id) -- one submission per user per battle
);

alter table public.battle_submissions enable row level security;

create index if not exists battle_submissions_battle_idx on public.battle_submissions (battle_id);
create index if not exists battle_submissions_user_idx on public.battle_submissions (user_id);

-- RLS for submissions
create policy "Authenticated users can view submissions"
  on public.battle_submissions
  for select
  using (auth.uid() is not null);

-- Only allow submitting if user joined the battle
create policy "Participants can create submissions"
  on public.battle_submissions
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.battle_participants p
      where p.battle_id = battle_id
        and p.user_id = auth.uid()
    )
  );

-- Owners or organizers can update/delete submissions
create policy "Owners or organizers can update submissions"
  on public.battle_submissions
  for update
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.battles b
      where b.id = battle_id and b.organizer_id = auth.uid()
    )
  );

create policy "Owners or organizers can delete submissions"
  on public.battle_submissions
  for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.battles b
      where b.id = battle_id and b.organizer_id = auth.uid()
    )
  );


-- Votes table
create table if not exists public.battle_votes (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles(id) on delete cascade,
  submission_id uuid not null references public.battle_submissions(id) on delete cascade,
  voter_id uuid not null,
  created_at timestamp with time zone not null default now(),
  unique (battle_id, voter_id) -- one vote per user per battle
);

alter table public.battle_votes enable row level security;

create index if not exists battle_votes_battle_idx on public.battle_votes (battle_id);
create index if not exists battle_votes_submission_idx on public.battle_votes (submission_id);
create index if not exists battle_votes_voter_idx on public.battle_votes (voter_id);

-- Ensure the vote references a submission in the same battle
create or replace function public.validate_vote_submission()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_sub_battle uuid;
begin
  select s.battle_id into v_sub_battle
  from public.battle_submissions s
  where s.id = new.submission_id;

  if v_sub_battle is null then
    raise exception 'Invalid submission_id';
  end if;

  if v_sub_battle <> new.battle_id then
    raise exception 'submission_id does not belong to the provided battle_id';
  end if;

  return new;
end;
$$;

create trigger battle_votes_validate
before insert on public.battle_votes
for each row execute procedure public.validate_vote_submission();

-- RLS for votes
create policy "Authenticated users can view votes"
  on public.battle_votes
  for select
  using (auth.uid() is not null);

create policy "Users can cast their own vote"
  on public.battle_votes
  for insert
  with check (auth.uid() = voter_id);

create policy "Users can delete their own vote"
  on public.battle_votes
  for delete
  using (auth.uid() = voter_id);


-- Realtime support for future live updates
alter table public.battles replica identity full;
alter table public.battle_participants replica identity full;
alter table public.battle_submissions replica identity full;
alter table public.battle_votes replica identity full;

-- Add to realtime publication
alter publication supabase_realtime add table public.battles;
alter publication supabase_realtime add table public.battle_participants;
alter publication supabase_realtime add table public.battle_submissions;
alter publication supabase_realtime add table public.battle_votes;
