-- Allow any authenticated user to read any playlist (required for shared links).
-- Write operations (insert/update/delete) remain owner-only.

-- Drop the old owner-only select policies
drop policy if exists "playlists_select_own" on public.playlists;
drop policy if exists "playlist_songs_select_own" on public.playlist_songs;

-- Any authenticated user can read any playlist
create policy "playlists_select_any" on public.playlists
  for select to authenticated using (true);

-- Any authenticated user can read songs in any playlist
create policy "playlist_songs_select_any" on public.playlist_songs
  for select to authenticated using (true);
