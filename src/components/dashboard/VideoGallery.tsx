'use client';

import { useState } from 'react';
import { VideoCard } from './VideoCard';
import { VideoPlayerDialog } from './VideoPlayerDialog';
import type { VideoWithListing } from '@/types/video';

interface VideoGalleryProps {
  videos: VideoWithListing[];
}

/**
 * Client component wrapping the video grid.
 * Manages selected video state and VideoPlayerDialog.
 */
export function VideoGallery({ videos }: VideoGalleryProps) {
  const [selectedVideo, setSelectedVideo] = useState<VideoWithListing | null>(null);

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
