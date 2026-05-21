# Social Engine — Danmaku Comments (Phases 0 & 1)

Building a right-to-left floating comment overlay over videos in `WatchFeed`. This plan covers the first two layers only. After approval and implementation, I will stop and request confirmation before Phases 2–4.

## Phase 0 — Database (Supabase migration)

One migration creating the comment system, RLS, and realtime publication.

**Tables**

`public.comments`
- `id uuid pk default gen_random_uuid()`
- `video_id uuid not null` (references the feed item — stored as uuid; no FK because feed items come from multiple sources)
- `user_id uuid not null` (references `auth.users`)
- `content text not null check (char_length(content) between 1 and 150)`
- `is_deleted boolean not null default false`
- `created_at timestamptz not null default now()`
- Indexes: `(video_id, created_at desc)`, `(user_id)`

`public.comment_mentions`
- `id uuid pk default gen_random_uuid()`
- `comment_id uuid not null references public.comments(id) on delete cascade`
- `mentioned_user_id uuid not null`
- `created_at timestamptz not null default now()`
- Index: `(mentioned_user_id)`

**Profiles** — `display_name` and `avatar_url` already exist on `public.profiles`; migration will `ADD COLUMN IF NOT EXISTS` as a safety no-op.

**RLS**

`comments`:
- SELECT: `is_deleted = false` (public read).
- INSERT: `auth.uid() = user_id`.
- UPDATE (soft-delete only): `auth.uid() = user_id` with `WITH CHECK (is_deleted = true)` so the only allowed mutation is flipping `is_deleted`.
- No DELETE policy.

`comment_mentions`:
- SELECT: public read.
- INSERT: caller must own the parent comment (`exists (select 1 from comments c where c.id = comment_id and c.user_id = auth.uid())`).

**Realtime** — `alter publication supabase_realtime add table public.comments;` and set `replica identity full` so payloads include the row.

## Phase 1 — Data hook (`src/hooks/useVideoComments.ts`)

Signature: `useVideoComments(videoId: string | null | undefined)`.

Behavior:
- Disabled when `videoId` is falsy.
- Initial fetch: latest 50 non-deleted comments for `video_id`, ordered `created_at desc`, then reversed for display order. Joins `profiles` via a secondary fetch keyed by `user_id` list (the FK from `comments.user_id` to `auth.users` blocks PostgREST embedding of `profiles`, so we batch-load via `get_multiple_public_profiles` RPC which already exists).
- Subscribes to a Supabase Realtime channel `comments:video:${videoId}` on `postgres_changes` event `INSERT`, filter `video_id=eq.${videoId}`. New rows are hydrated with the author profile (cached map, lazy fetch on miss) and prepended to state.
- Cleanup removes the channel on unmount / `videoId` change.
- `submitComment(content: string)`: trims, enforces 1–150 chars, inserts into `comments` with current `auth.uid()`, then parses `/@(\w+)/g`. For each unique handle, look up `user_id` via a `profiles` query on `display_name` (case-insensitive), and bulk-insert into `comment_mentions`. Returns the inserted comment row or throws.
- `searchUsers(query: string)`: returns up to 8 profiles where `display_name ilike '${query}%'`, selecting `user_id, display_name, avatar_url`. Debouncing is the caller's responsibility.

Exposed shape:
```
{ comments, loading, error, submitComment, searchUsers, submitting }
```

Each `comment` carries `{ id, video_id, user_id, content, created_at, display_name, avatar_url }` so the overlay can render without further lookups.

## Technical notes

- No changes to `WatchFeed` or any UI in this phase — overlay and input bar arrive in Phase 2/3.
- `video_id` is stored as `uuid`; feed items in `build_universal_feed` already expose `item_id uuid` which the overlay will pass through.
- Soft-delete via UPDATE is the deletion path; clients filter `is_deleted = false` and RLS double-enforces read scope.
- The realtime channel name is video-scoped so subscriptions don't cross-pollinate when the active video changes in the feed.

## Deliverables this round

1. Migration creating both tables, RLS policies, indexes, and the realtime publication entry.
2. `src/hooks/useVideoComments.ts` implementing fetch + realtime + `submitComment` + `searchUsers`.

After both ship, I will stop and wait for your go-ahead before Phase 2 (overlay), Phase 3 (input bar), and Phase 4 (WatchFeed wiring).
