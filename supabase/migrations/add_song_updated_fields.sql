-- Add updated_at / updated_by to songs
ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by text;

-- Backfill existing rows: use original created_at as updated_at,
-- and the first user's email for updated_by (and created_by where missing).
UPDATE songs
SET
  updated_at = COALESCE(created_at, now()),
  updated_by = COALESCE(created_by, 'tidhar.peer@gmail.com')
WHERE updated_at IS NULL;

UPDATE songs
SET created_by = 'tidhar.peer@gmail.com'
WHERE created_by IS NULL;
