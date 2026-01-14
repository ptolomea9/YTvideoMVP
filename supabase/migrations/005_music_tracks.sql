-- Migration: 005_music_tracks
-- Description: Add music_tracks table for self-hosted background music library

-- Create music energy enum
CREATE TYPE music_energy AS ENUM ('low', 'medium', 'high');

-- Create music_tracks table
CREATE TABLE music_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT,
  duration INTEGER NOT NULL, -- Duration in seconds
  energy music_energy NOT NULL DEFAULT 'medium',
  tags TEXT[] DEFAULT '{}',
  file_path TEXT NOT NULL, -- Path in Supabase Storage
  file_url TEXT, -- Full public URL (generated after upload)
  preview_url TEXT, -- Same as file_url for self-hosted
  source TEXT DEFAULT 'library', -- 'library' for curated, 'upload' for user uploads
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for energy filtering
CREATE INDEX idx_music_tracks_energy ON music_tracks(energy);
CREATE INDEX idx_music_tracks_active ON music_tracks(is_active);

-- Unique constraint on file_path for upsert support
CREATE UNIQUE INDEX idx_music_tracks_file_path ON music_tracks(file_path);

-- Add RLS policies
ALTER TABLE music_tracks ENABLE ROW LEVEL SECURITY;

-- Anyone can read active tracks
CREATE POLICY "Anyone can read active music tracks"
  ON music_tracks
  FOR SELECT
  USING (is_active = TRUE);

-- Only admins can insert/update/delete (via service role key)
-- No insert/update/delete policies for regular users

-- Create storage bucket for music files
INSERT INTO storage.buckets (id, name, public)
VALUES ('music', 'music', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to music bucket
CREATE POLICY "Public read access for music"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'music');

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_music_tracks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_music_tracks_updated_at
  BEFORE UPDATE ON music_tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_music_tracks_updated_at();

-- Add helpful comment
COMMENT ON TABLE music_tracks IS 'Self-hosted background music library for video generation';
