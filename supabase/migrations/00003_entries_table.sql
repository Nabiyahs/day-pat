-- Entries Table and Storage Setup
-- Migration: 00003_entries_table.sql
--
-- This creates the main 'entries' table for storing photos and praise text.
-- Each user can have one entry per date.

-- ============================================
-- 1. ENTRIES TABLE (ONE per date per user)
-- ============================================
CREATE TABLE IF NOT EXISTS entries (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    praise TEXT,
    photo_path TEXT, -- Storage path in entry-photos bucket (e.g., "uid/2026-01-07/uuid.webp")
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, entry_date)
);

-- Index for efficient querying by user and date
CREATE INDEX IF NOT EXISTS idx_entries_user_date ON entries(user_id, entry_date);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: ENTRIES
-- ============================================
-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their own entries" ON entries;
DROP POLICY IF EXISTS "Users can insert their own entries" ON entries;
DROP POLICY IF EXISTS "Users can update their own entries" ON entries;
DROP POLICY IF EXISTS "Users can delete their own entries" ON entries;

CREATE POLICY "Users can view their own entries"
    ON entries FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own entries"
    ON entries FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own entries"
    ON entries FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own entries"
    ON entries FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================
-- STORAGE BUCKET: entry-photos (PRIVATE)
-- ============================================
-- Create the storage bucket (private bucket)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'entry-photos',
    'entry-photos',
    false, -- Private bucket (requires signed URLs)
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- ============================================
-- STORAGE POLICIES: entry-photos
-- ============================================
-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can upload to entry-photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update entry-photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete entry-photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view entry-photos" ON storage.objects;

-- Policy: Users can upload to their own folder
-- Path must start with user's UUID: {uid}/{date}/{filename}
CREATE POLICY "Users can upload to entry-photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'entry-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own photos
CREATE POLICY "Users can update entry-photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'entry-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own photos
CREATE POLICY "Users can delete entry-photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'entry-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own photos (for signed URLs)
CREATE POLICY "Users can view entry-photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'entry-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
);
