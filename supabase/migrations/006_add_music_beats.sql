-- Migration: 006_add_music_beats
-- Description: Add beats array to music_tracks for beat-synced video transitions

-- Add beats column - array of timestamps in seconds where beats occur
ALTER TABLE music_tracks ADD COLUMN IF NOT EXISTS beats DOUBLE PRECISION[] DEFAULT '{}';

-- Add BPM column for reference
ALTER TABLE music_tracks ADD COLUMN IF NOT EXISTS bpm INTEGER;

-- Add comment
COMMENT ON COLUMN music_tracks.beats IS 'Array of beat timestamps in seconds, detected via audio analysis';
COMMENT ON COLUMN music_tracks.bpm IS 'Beats per minute of the track';
