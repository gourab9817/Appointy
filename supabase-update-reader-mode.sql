-- Add Reader Mode columns to existing memories table
-- Run this if you already have a memories table

ALTER TABLE memories ADD COLUMN IF NOT EXISTS full_text TEXT;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS excerpt TEXT;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS word_count INTEGER;

-- Update the full-text search index to include full_text
DROP INDEX IF EXISTS idx_memories_search;
CREATE INDEX idx_memories_search ON memories 
USING GIN(to_tsvector('english', title || ' ' || COALESCE(note, '') || ' ' || COALESCE(full_text, '')));

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'memories' 
ORDER BY ordinal_position;

