-- Personal concert dates: each user can set their own concert date for any playlist,
-- independently of the playlist owner's canonical date (playlists.concert_date).
CREATE TABLE IF NOT EXISTS user_concert_dates (
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  playlist_id uuid REFERENCES playlists(id)  ON DELETE CASCADE,
  concert_date date NOT NULL,
  PRIMARY KEY (user_id, playlist_id)
);

ALTER TABLE user_concert_dates ENABLE ROW LEVEL SECURITY;

-- Grant read/write to authenticated users (required for raw SQL migrations)
GRANT SELECT, INSERT, UPDATE, DELETE ON user_concert_dates TO authenticated;

CREATE POLICY "Users manage own concert dates"
  ON user_concert_dates
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
