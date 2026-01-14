-- Migration: 007_add_drum_hits
-- Description: Add separate bass and snare hit arrays for beat-synced video transitions

-- Add bass_hits column - kick drum timestamps
ALTER TABLE music_tracks
  ADD COLUMN IF NOT EXISTS bass_hits DOUBLE PRECISION[] DEFAULT '{}';

-- Add snare_hits column - snare drum timestamps
ALTER TABLE music_tracks
  ADD COLUMN IF NOT EXISTS snare_hits DOUBLE PRECISION[] DEFAULT '{}';

-- Add comments
COMMENT ON COLUMN music_tracks.bass_hits IS 'Kick/bass drum hit timestamps in seconds, detected via spectral analysis';
COMMENT ON COLUMN music_tracks.snare_hits IS 'Snare drum hit timestamps in seconds, detected via spectral analysis';
