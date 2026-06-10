ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS play_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION increment_play_count(song_id uuid)
RETURNS void AS $$
  UPDATE songs SET play_count = play_count + 1 WHERE id = song_id;
$$ LANGUAGE sql SECURITY DEFINER;
