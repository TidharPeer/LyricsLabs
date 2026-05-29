-- Run this in Supabase SQL Editor after the main schema.
-- Atomically increments the stars counter and returns the new total.

CREATE OR REPLACE FUNCTION add_stars(p_user_id UUID, p_amount INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_total INT;
BEGIN
  INSERT INTO user_stats (user_id, stars)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE
    SET stars      = user_stats.stars + p_amount,
        updated_at = now()
  RETURNING stars INTO new_total;

  RETURN new_total;
END;
$$;
