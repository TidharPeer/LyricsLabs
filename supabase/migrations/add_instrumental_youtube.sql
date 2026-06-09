ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS instrumental_youtube_url text,
  ADD COLUMN IF NOT EXISTS instrumental_youtube_id  text;
