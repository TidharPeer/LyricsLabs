-- ================================================================
-- RLS policies for the songs table (shared pool)
-- Run this in Supabase SQL Editor if songs are missing on new devices.
-- ================================================================

-- Anyone authenticated can read all songs (shared pool)
CREATE POLICY "authenticated users can read songs"
ON songs FOR SELECT
TO authenticated
USING (true);

-- Users can only insert songs as themselves
CREATE POLICY "users can insert own songs"
ON songs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Users can only edit their own songs
CREATE POLICY "users can update own songs"
ON songs FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

-- Users can only delete their own songs
CREATE POLICY "users can delete own songs"
ON songs FOR DELETE
TO authenticated
USING (auth.uid() = created_by);
