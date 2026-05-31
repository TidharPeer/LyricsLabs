-- Add position column to playlist_songs for manual song ordering
ALTER TABLE public.playlist_songs
  ADD COLUMN IF NOT EXISTS position integer;

-- Populate existing rows using their current added_at order (0-based per playlist)
UPDATE public.playlist_songs ps
SET position = sub.rn
FROM (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY playlist_id ORDER BY added_at ASC) - 1 AS rn
  FROM public.playlist_songs
) sub
WHERE ps.id = sub.id;
