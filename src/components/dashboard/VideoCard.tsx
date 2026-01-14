'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { VideoWithListing, VIDEO_STATUS_CONFIG } from '@/types/video';
import { cn } from '@/lib/utils';

interface VideoCardProps {
  video: VideoWithListing;
}

/**
 * VideoCard displays a single video in 9:16 aspect ratio.
 * Shows thumbnail (or placeholder), status badge, and property address.
 * Hover state includes subtle scale and border highlight.
 */
export function VideoCard({ video }: VideoCardProps) {
  const statusConfig = VIDEO_STATUS_CONFIG[video.status];

  // Format address for display
  const displayAddress = video.listing.city && video.listing.state
    ? `${video.listing.address}, ${video.listing.city}`
    : video.listing.address;

  return (
    <motion.div
      className="group relative overflow-hidden rounded-xl border border-border bg-card"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* 9:16 aspect ratio container */}
      <div className="aspect-[9/16] relative">
        {/* Thumbnail or placeholder gradient */}
        {video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt={`Video thumbnail for ${video.listing.address}`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-muted to-card" />
        )}

        {/* Status badge - top right */}
        <div className="absolute top-3 right-3">
          <span
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm',
              {
                'bg-gold/20 text-gold border border-gold/30': statusConfig.color === 'gold',
                'bg-muted/80 text-muted-foreground border border-border': statusConfig.color === 'muted',
                'bg-destructive/20 text-destructive border border-destructive/30': statusConfig.color === 'destructive',
              }
            )}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* Address overlay - bottom with gradient */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
          <p className="text-sm font-medium text-white truncate">{displayAddress}</p>
        </div>

        {/* Hover border highlight */}
        <div className="absolute inset-0 border-2 border-transparent group-hover:border-gold/50 rounded-xl transition-colors duration-200 pointer-events-none" />
      </div>
    </motion.div>
  );
}
