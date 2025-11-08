-- Second Memory Database Schema for Supabase

-- Create memories table
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  tags TEXT[], -- Array of tags
  category TEXT NOT NULL,
  platform TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  favicon TEXT,
  thumbnail TEXT, -- URL to thumbnail in Supabase Storage
  selected_text TEXT,
  full_text TEXT, -- Complete article text for Reader Mode
  excerpt TEXT, -- First 500 chars excerpt
  word_count INTEGER, -- Number of words in full text
  metadata JSONB, -- For future extensibility
  user_id TEXT -- For future multi-user support
);

-- Create indexes for fast searches
CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_memories_platform ON memories(platform);
CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
CREATE INDEX IF NOT EXISTS idx_memories_tags ON memories USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at DESC);

-- Full-text search index (includes full_text for Reader Mode content)
CREATE INDEX IF NOT EXISTS idx_memories_search ON memories 
USING GIN(to_tsvector('english', title || ' ' || COALESCE(note, '') || ' ' || COALESCE(full_text, '')));

-- Enable Row Level Security (RLS)
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for now (no auth yet)
CREATE POLICY "Allow all operations" ON memories
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create storage bucket for thumbnails and images
INSERT INTO storage.buckets (id, name, public)
VALUES ('memory-images', 'memory-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Allow public read
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'memory-images');

-- Storage policy: Allow authenticated uploads
CREATE POLICY "Allow uploads" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'memory-images');

-- Storage policy: Allow deletes
CREATE POLICY "Allow deletes" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'memory-images');

-- Create screenshots table
CREATE TABLE IF NOT EXISTS screenshots (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL, -- Supabase Storage URL
  extracted_text TEXT, -- Text extracted from screenshot using Gemini Vision
  tags TEXT[],
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB,
  user_id TEXT
);

-- Create indexes for screenshots
CREATE INDEX IF NOT EXISTS idx_screenshots_timestamp ON screenshots(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_screenshots_created_at ON screenshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screenshots_search ON screenshots 
USING GIN(to_tsvector('english', title || ' ' || COALESCE(extracted_text, '')));

-- Enable RLS for screenshots
ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on screenshots" ON screenshots
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create PDFs table
CREATE TABLE IF NOT EXISTS pdfs (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  pdf_url TEXT NOT NULL, -- Supabase Storage URL
  summary TEXT, -- AI-generated summary using Gemini
  full_text TEXT, -- Extracted full text from PDF
  tags TEXT[],
  page_count INTEGER,
  file_size BIGINT,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB,
  user_id TEXT
);

-- Create indexes for PDFs
CREATE INDEX IF NOT EXISTS idx_pdfs_timestamp ON pdfs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pdfs_created_at ON pdfs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdfs_search ON pdfs 
USING GIN(to_tsvector('english', title || ' ' || COALESCE(summary, '') || ' ' || COALESCE(full_text, '')));

-- Enable RLS for PDFs
ALTER TABLE pdfs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on pdfs" ON pdfs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create storage bucket for screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('screenshots', 'screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdfs', 'pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for screenshots bucket
CREATE POLICY "Public read screenshots" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'screenshots');

CREATE POLICY "Allow screenshot uploads" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'screenshots');

CREATE POLICY "Allow screenshot deletes" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'screenshots');

-- Storage policies for PDFs bucket
CREATE POLICY "Public read pdfs" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'pdfs');

CREATE POLICY "Allow pdf uploads" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'pdfs');

CREATE POLICY "Allow pdf deletes" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'pdfs');

