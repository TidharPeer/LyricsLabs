ALTER TABLE playlists
  ADD COLUMN IF NOT EXISTS concert_date date;
