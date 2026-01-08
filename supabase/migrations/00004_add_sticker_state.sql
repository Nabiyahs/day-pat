-- Add sticker_state column to entries table
-- Migration: 00004_add_sticker_state.sql
--
-- Adds JSONB column to store sticker placement data per entry.
-- Stickers are stored as an array of placement objects:
-- [{ "emoji": "/sticker/sensa/xxx.png", "x": 0.5, "y": 0.4, "scale": 0.8, "rotate": 0, "z": 1 }, ...]

-- Add sticker_state column (nullable with default empty array)
ALTER TABLE entries
ADD COLUMN IF NOT EXISTS sticker_state JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN entries.sticker_state IS 'JSON array of sticker placements: [{emoji, x, y, scale, rotate, z}, ...]';
