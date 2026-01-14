/**
 * Default Music Library for Video Generation
 *
 * Provides background music options for video tours.
 * Music files are stored in S3 and referenced by URL.
 */

/**
 * Music track metadata.
 */
export interface MusicTrack {
  id: string;
  name: string;
  url: string;
  mood: "luxury" | "upbeat" | "calm" | "modern";
  durationSeconds?: number;
}

/**
 * Available music tracks for video background.
 *
 * These tracks are pre-cleared for commercial use and stored in S3.
 * The workflow handles volume ducking during narration.
 */
export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: "luxury-ambient",
    name: "Luxury Ambient",
    url: "https://edgeaireality.s3.eu-north-1.amazonaws.com/music/luxury-ambient.mp3",
    mood: "luxury",
  },
  {
    id: "elegant-piano",
    name: "Elegant Piano",
    url: "https://edgeaireality.s3.eu-north-1.amazonaws.com/music/elegant-piano.mp3",
    mood: "calm",
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    url: "https://edgeaireality.s3.eu-north-1.amazonaws.com/music/modern-minimal.mp3",
    mood: "modern",
  },
  {
    id: "upbeat-corporate",
    name: "Upbeat Corporate",
    url: "https://edgeaireality.s3.eu-north-1.amazonaws.com/music/upbeat-corporate.mp3",
    mood: "upbeat",
  },
];

/**
 * Get the default music track for video generation.
 * Used when no specific track is selected.
 */
export function getDefaultMusicTrack(): MusicTrack {
  return MUSIC_TRACKS[0];
}

/**
 * Get the URL for the default music track.
 */
export function getDefaultMusicUrl(): string {
  return getDefaultMusicTrack().url;
}

/**
 * Find a music track by its ID.
 */
export function getMusicTrackById(id: string): MusicTrack | undefined {
  return MUSIC_TRACKS.find((track) => track.id === id);
}

/**
 * Get music tracks filtered by mood.
 */
export function getMusicTracksByMood(mood: MusicTrack["mood"]): MusicTrack[] {
  return MUSIC_TRACKS.filter((track) => track.mood === mood);
}
