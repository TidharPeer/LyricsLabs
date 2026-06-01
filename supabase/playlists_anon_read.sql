-- Allow unauthenticated (anon) users to read shared playlists.
-- Required because playlist_songs?select=songs(*) joins through the songs table.
-- Write operations remain owner-only on the authenticated side.

GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.playlists      TO anon;
GRANT SELECT ON public.playlist_songs TO anon;
GRANT SELECT ON public.songs          TO anon;

CREATE POLICY "playlists_select_anon" ON public.playlists
  FOR SELECT TO anon USING (true);

CREATE POLICY "playlist_songs_select_anon" ON public.playlist_songs
  FOR SELECT TO anon USING (true);

-- songs table already has an authenticated policy; add the anon equivalent
DROP POLICY IF EXISTS "songs_select_anon" ON public.songs;
CREATE POLICY "songs_select_anon" ON public.songs
  FOR SELECT TO anon USING (true);
