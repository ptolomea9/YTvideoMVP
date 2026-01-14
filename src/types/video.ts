/**
 * Video types for dashboard and gallery components.
 * Mirrors videos table schema from Supabase.
 */

export type VideoStatus =
  | 'pending'
  | 'processing'
  | 'sorting_images'
  | 'generating_motion'
  | 'generating_audio'
  | 'rendering'
  | 'completed'
  | 'failed';

export interface Video {
  id: string;
  listing_id: string;
  user_id: string;
  status: VideoStatus;
  thumbnail_url: string | null;
  branded_url: string | null;
  unbranded_url: string | null;
  duration_seconds: number | null;
  error_message: string | null;
  created_at: string;
}

export interface VideoWithListing extends Video {
  listing: {
    address: string;
    city: string | null;
    state: string | null;
  };
}

/**
 * Status badge configuration for each video status.
 */
export const VIDEO_STATUS_CONFIG: Record<VideoStatus, { label: string; color: 'gold' | 'muted' | 'destructive' }> = {
  pending: { label: 'Pending', color: 'muted' },
  processing: { label: 'Processing', color: 'muted' },
  sorting_images: { label: 'Sorting', color: 'muted' },
  generating_motion: { label: 'Motion', color: 'muted' },
  generating_audio: { label: 'Audio', color: 'muted' },
  rendering: { label: 'Rendering', color: 'muted' },
  completed: { label: 'Ready', color: 'gold' },
  failed: { label: 'Failed', color: 'destructive' },
};
