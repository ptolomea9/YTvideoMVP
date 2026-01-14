'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { VideoCard } from './VideoCard';
import { VideoPlayerDialog } from './VideoPlayerDialog';
import type { VideoWithListing, VideoStatus } from '@/types/video';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface VideoGalleryProps {
  initialVideos: VideoWithListing[];
  userId: string;
}

interface VideoRecord {
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

/**
 * Client component wrapping the video grid with realtime updates.
 * Subscribes to Supabase Realtime for video status changes.
 * Updates local state when videos change (INSERT/UPDATE events).
 */
export function VideoGallery({ initialVideos, userId }: VideoGalleryProps) {
  const [videos, setVideos] = useState<VideoWithListing[]>(initialVideos);
  const [selectedVideo, setSelectedVideo] = useState<VideoWithListing | null>(null);
  const router = useRouter();

  // Subscribe to video changes for this user
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`video-gallery-${userId}`)
      .on<VideoRecord>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'videos',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<VideoRecord>) => {
          const updatedVideo = payload.new as VideoRecord;

          // Update the video in local state
          setVideos((currentVideos) =>
            currentVideos.map((video) =>
              video.id === updatedVideo.id
                ? {
                    ...video,
                    status: updatedVideo.status,
                    thumbnail_url: updatedVideo.thumbnail_url,
                    branded_url: updatedVideo.branded_url,
                    unbranded_url: updatedVideo.unbranded_url,
                    duration_seconds: updatedVideo.duration_seconds,
                    error_message: updatedVideo.error_message,
                  }
                : video
            )
          );

          // Also update selected video if it's the one that changed
          setSelectedVideo((current) =>
            current?.id === updatedVideo.id
              ? {
                  ...current,
                  status: updatedVideo.status,
                  thumbnail_url: updatedVideo.thumbnail_url,
                  branded_url: updatedVideo.branded_url,
                  unbranded_url: updatedVideo.unbranded_url,
                  duration_seconds: updatedVideo.duration_seconds,
                  error_message: updatedVideo.error_message,
                }
              : current
          );
        }
      )
      .on<VideoRecord>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'videos',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // For new videos, refresh the page to get full listing data
          // This is simpler than fetching listing data separately
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            onSelect={() => setSelectedVideo(video)}
          />
        ))}
      </div>

      <VideoPlayerDialog
        video={selectedVideo}
        open={selectedVideo !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedVideo(null);
        }}
      />
    </>
  );
}
