-- Make photo_path optional for text-only entries
-- Migration: 00005_make_photo_optional.sql
--
-- This allows users to save entries with just text (praise) without a photo.
-- The stamp will be displayed centered for text-only entries.

-- ============================================
-- 1. ALTER ENTRIES TABLE - make photo_path nullable
-- ============================================
ALTER TABLE entries ALTER COLUMN photo_path DROP NOT NULL;

-- Update comment to reflect the change
COMMENT ON COLUMN entries.photo_path IS 'Optional: Storage path in entry-photos bucket (e.g., "uid/2026-01-07/uuid.webp"). NULL for text-only entries.';
