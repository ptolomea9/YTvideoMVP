-- =====================================================
-- Audio Storage Bucket for TTS Audio Files
-- =====================================================
-- Creates a public bucket for storing ElevenLabs TTS audio
-- Used by n8n workflow for voice narration

-- Create the audio storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio-files',
  'audio-files',
  true,
  10485760, -- 10MB max file size
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to audio files
CREATE POLICY "Public read access for audio files"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-files');

-- Allow authenticated uploads to audio files
CREATE POLICY "Authenticated users can upload audio"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'audio-files');

-- Allow service role to manage audio files (for n8n webhook)
CREATE POLICY "Service role full access to audio"
ON storage.objects FOR ALL
USING (bucket_id = 'audio-files');
