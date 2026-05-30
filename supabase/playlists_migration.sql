-- Run this in your Supabase SQL editor to enable the Playlists feature.

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.playlists (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  created_by uuid        not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.playlist_songs (
  id          uuid        primary key default gen_random_uuid(),
  playlist_id uuid        not null references public.playlists(id) on delete cascade,
  song_id     uuid        not null references public.songs(id) on delete cascade,
  added_at    timestamptz not null default now(),
  unique(playlist_id, song_id)
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

create index if not exists playlists_created_by_idx on public.playlists(created_by);
create index if not exists playlist_songs_playlist_id_idx on public.playlist_songs(playlist_id);
create index if not exists playlist_songs_song_id_idx on public.playlist_songs(song_id);

-- ─── Row-Level Security ───────────────────────────────────────────────────────

alter table public.playlists enable row level security;
alter table public.playlist_songs enable row level security;

-- Playlists: full CRUD for owner
create policy "playlists_select_own" on public.playlists
  for select to authenticated using (auth.uid() = created_by);

create policy "playlists_insert_own" on public.playlists
  for insert to authenticated with check (auth.uid() = created_by);

create policy "playlists_update_own" on public.playlists
  for update to authenticated
  using (auth.uid() = created_by) with check (auth.uid() = created_by);

create policy "playlists_delete_own" on public.playlists
  for delete to authenticated using (auth.uid() = created_by);

-- Playlist songs: full CRUD if the parent playlist belongs to the caller
create policy "playlist_songs_select_own" on public.playlist_songs
  for select to authenticated using (
    exists (
      select 1 from public.playlists
      where playlists.id = playlist_songs.playlist_id
        and playlists.created_by = auth.uid()
    )
  );

create policy "playlist_songs_insert_own" on public.playlist_songs
  for insert to authenticated with check (
    exists (
      select 1 from public.playlists
      where playlists.id = playlist_songs.playlist_id
        and playlists.created_by = auth.uid()
    )
  );

create policy "playlist_songs_delete_own" on public.playlist_songs
  for delete to authenticated using (
    exists (
      select 1 from public.playlists
      where playlists.id = playlist_songs.playlist_id
        and playlists.created_by = auth.uid()
    )
  );

-- ─── Grants ───────────────────────────────────────────────────────────────────
-- Required so the authenticated role can actually reach the tables.

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.playlists to authenticated;
grant select, insert, update, delete on public.playlist_songs to authenticated;
