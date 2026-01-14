/**
 * Music Library Types
 *
 * Types for background music selection and management.
 */

/**
 * Energy/mood levels for music filtering.
 */
export type MusicEnergy = "low" | "medium" | "high";

/**
 * Music track metadata.
 */
export interface MusicTrack {
  id: string;
  title: string;
  artist?: string;
  duration: number; // seconds
  energy: MusicEnergy;
  tags: string[];
  previewUrl: string;
  downloadUrl: string;
  source: "library" | "upload" | "pixabay";
}

/**
 * Music library filter options.
 */
export interface MusicFilters {
  energy?: MusicEnergy;
  search?: string;
  minDuration?: number;
  maxDuration?: number;
}

/**
 * User-uploaded music track.
 */
export interface UploadedMusic {
  id: string;
  name: string;
  url: string;
  duration: number;
  uploadedAt: string;
}

/**
 * Music selection state for the wizard.
 */
export interface MusicSelection {
  type: "library" | "upload" | "none";
  trackId?: string;
  trackUrl?: string;
  trackName?: string;
}

/**
 * Curated music tracks for the library.
 * These are royalty-free tracks suitable for real estate videos.
 */
export const CURATED_TRACKS: MusicTrack[] = [
  // Low Energy - Calm, Elegant
  {
    id: "elegant-piano-1",
    title: "Elegant Spaces",
    artist: "Ambient Studio",
    duration: 180,
    energy: "low",
    tags: ["piano", "elegant", "luxury", "calm"],
    previewUrl: "https://cdn.pixabay.com/audio/2024/11/04/audio_af14b6ba42.mp3",
    downloadUrl: "https://cdn.pixabay.com/audio/2024/11/04/audio_af14b6ba42.mp3",
    source: "pixabay",
  },
  {
    id: "ambient-luxury-1",
    title: "Luxury Living",
    artist: "Cinematic Sounds",
    duration: 150,
    energy: "low",
    tags: ["ambient", "luxury", "sophisticated", "modern"],
    previewUrl: "https://cdn.pixabay.com/audio/2024/08/12/audio_e409a0c1c6.mp3",
    downloadUrl: "https://cdn.pixabay.com/audio/2024/08/12/audio_e409a0c1c6.mp3",
    source: "pixabay",
  },
  // Medium Energy - Uplifting, Inspiring
  {
    id: "inspiring-corporate-1",
    title: "New Horizons",
    artist: "Motivate Music",
    duration: 165,
    energy: "medium",
    tags: ["inspiring", "corporate", "uplifting", "modern"],
    previewUrl: "https://cdn.pixabay.com/audio/2023/09/05/audio_72e8e04d4b.mp3",
    downloadUrl: "https://cdn.pixabay.com/audio/2023/09/05/audio_72e8e04d4b.mp3",
    source: "pixabay",
  },
  {
    id: "modern-tech-1",
    title: "Modern Living",
    artist: "Tech Vibes",
    duration: 140,
    energy: "medium",
    tags: ["modern", "tech", "clean", "professional"],
    previewUrl: "https://cdn.pixabay.com/audio/2024/03/11/audio_369fdc8ee1.mp3",
    downloadUrl: "https://cdn.pixabay.com/audio/2024/03/11/audio_369fdc8ee1.mp3",
    source: "pixabay",
  },
  // High Energy - Upbeat, Dynamic
  {
    id: "upbeat-pop-1",
    title: "City Lights",
    artist: "Urban Beats",
    duration: 155,
    energy: "high",
    tags: ["upbeat", "pop", "energetic", "fun"],
    previewUrl: "https://cdn.pixabay.com/audio/2024/04/24/audio_7dc33e6fba.mp3",
    downloadUrl: "https://cdn.pixabay.com/audio/2024/04/24/audio_7dc33e6fba.mp3",
    source: "pixabay",
  },
  {
    id: "dynamic-cinematic-1",
    title: "Grand Opening",
    artist: "Epic Scores",
    duration: 175,
    energy: "high",
    tags: ["cinematic", "epic", "dynamic", "powerful"],
    previewUrl: "https://cdn.pixabay.com/audio/2023/10/31/audio_8e94b8bccf.mp3",
    downloadUrl: "https://cdn.pixabay.com/audio/2023/10/31/audio_8e94b8bccf.mp3",
    source: "pixabay",
  },
];

/**
 * Get tracks filtered by energy level.
 */
export function getTracksByEnergy(energy: MusicEnergy): MusicTrack[] {
  return CURATED_TRACKS.filter((track) => track.energy === energy);
}

/**
 * Get a track by ID.
 */
export function getTrackById(id: string): MusicTrack | undefined {
  return CURATED_TRACKS.find((track) => track.id === id);
}

/**
 * Energy level labels for UI.
 */
export const ENERGY_LABELS: Record<MusicEnergy, { label: string; description: string }> = {
  low: {
    label: "Calm",
    description: "Elegant, sophisticated, relaxed",
  },
  medium: {
    label: "Balanced",
    description: "Inspiring, uplifting, professional",
  },
  high: {
    label: "Energetic",
    description: "Dynamic, exciting, powerful",
  },
};
