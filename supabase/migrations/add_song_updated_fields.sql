-- Add updated_at / updated_by to songs
ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by text;

-- Backfill: use original created_at as updated_at; cast uuid created_by to text.
UPDATE songs
SET
  updated_at = COALESCE(created_at, now()),
  updated_by = COALESCE(created_by::text, 'tidhar.peer@gmail.com')
WHERE updated_at IS NULL;

-- Backfill created_by where NULL using the real user UUID from auth.
UPDATE songs
SET created_by = (SELECT id FROM auth.users WHERE email = 'tidhar.peer@gmail.com' LIMIT 1)
WHERE created_by IS NULL;
