'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { Loader2, Play, Download, Trash2 } from 'lucide-react';
import { VideoWithListing, VIDEO_STATUS_CONFIG } from '@/types/video';
import { cn } from '@/lib/utils';
import { VideoProgressOverlay } from './VideoProgressOverlay';
import { MediaKitDialog } from './MediaKitDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface VideoCardProps {
  video: VideoWithListing;
  onSelect?: () => void;
  onDelete?: (videoId: string) => void;
}

/**
 * VideoCard displays a single video in 9:16 aspect ratio.
 * Shows thumbnail (or placeholder), status badge, and property address.
 * Hover state includes subtle scale and border highlight.
 * Completed videos autoplay on hover.
 */
export function VideoCard({ video, onSelect, onDelete }: VideoCardProps) {
  const statusConfig = VIDEO_STATUS_CONFIG[video.status];
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [mediaKitOpen, setMediaKitOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    onDelete(video.id);
  };

  // Format address for display
  const displayAddress = video.listing.city && video.listing.state
    ? `${video.listing.address}, ${video.listing.city}`
    : video.listing.address;

  // Check if video is completed and has a video URL
  const canPlayVideo = video.status === 'completed' && video.branded_url;
  const isClickable = canPlayVideo && onSelect;

  // Check if video is in-progress or failed (for overlay and disabling hover)
  const isInProgress = ['pending', 'processing', 'sorting_images', 'generating_motion', 'generating_audio', 'rendering'].includes(video.status);
  const isFailed = video.status === 'failed';
  const showOverlay = isInProgress || isFailed;

  const handleClick = () => {
    if (isClickable) {
      onSelect();
    }
  };

  const handleMouseEnter = () => {
    // Don't activate hover effects for in-progress or failed videos
    if (showOverlay) return;

    setIsHovering(true);
    if (canPlayVideo && videoRef.current) {
      setIsVideoLoading(true);
      videoRef.current.play().catch(() => {
        // Ignore autoplay errors (browser restrictions)
        setIsVideoLoading(false);
      });
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setIsVideoLoading(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <motion.div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border bg-card',
        isClickable && 'cursor-pointer'
      )}
      whileHover={showOverlay ? undefined : { scale: 1.02 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* 9:16 aspect ratio container */}
      <div className="aspect-[9/16] relative">
        {/* Thumbnail or placeholder gradient - hidden when hovering on completed video */}
        <div className={cn(
          'absolute inset-0 transition-opacity duration-300',
          canPlayVideo && isHovering ? 'opacity-0' : 'opacity-100'
        )}>
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
        </div>

        {/* Video element for hover autoplay */}
        {canPlayVideo && (
          <video
            ref={videoRef}
            src={video.branded_url!}
            poster={video.thumbnail_url || undefined}
            muted
            loop
            playsInline
            className={cn(
              'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
              isHovering ? 'opacity-100' : 'opacity-0'
            )}
            onWaiting={() => setIsVideoLoading(true)}
            onCanPlay={() => setIsVideoLoading(false)}
            onPlaying={() => setIsVideoLoading(false)}
          />
        )}

        {/* Loading spinner during video load */}
        {isVideoLoading && isHovering && canPlayVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}

        {/* Play icon overlay for completed videos (visible on hover when not playing) */}
        {canPlayVideo && isHovering && !isVideoLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="p-4 rounded-full bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Play className="w-8 h-8 text-white fill-white" />
            </div>
          </div>
        )}

        {/* Progress overlay for in-progress and failed videos */}
        {showOverlay && (
          <VideoProgressOverlay
            status={video.status}
            errorMessage={video.error_message}
            address={displayAddress}
          />
        )}

        {/* Status badge - top right */}
        <div className="absolute top-3 right-3 z-10">
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

        {/* Delete button - top left, visible on hover */}
        {onDelete && (
          <div className="absolute top-3 left-3 z-20">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  disabled={isDeleting}
                  className={cn(
                    'p-2 rounded-full bg-black/50 hover:bg-destructive/80 transition-colors backdrop-blur-sm',
                    'opacity-0 group-hover:opacity-100',
                    'focus:outline-none focus:opacity-100',
                    isDeleting && 'opacity-50 cursor-not-allowed'
                  )}
                  aria-label="Delete video"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-white" />
                  )}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this video?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the video for &quot;{displayAddress}&quot; and cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Address overlay - bottom with gradient (hidden when progress overlay is shown) */}
        {!showOverlay && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12 z-10">
            <div className="flex items-end justify-between">
              <p className="text-sm font-medium text-white truncate flex-1 mr-2">{displayAddress}</p>
              {/* Download button for completed videos */}
              {canPlayVideo && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMediaKitOpen(true);
                  }}
                  className={cn(
                    'p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors',
                    'opacity-0 group-hover:opacity-100',
                    'focus:outline-none focus:opacity-100'
                  )}
                  aria-label="Download video"
                >
                  <Download className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Hover border highlight */}
        <div className="absolute inset-0 border-2 border-transparent group-hover:border-gold/50 rounded-xl transition-colors duration-200 pointer-events-none z-10" />
      </div>

      {/* Media Kit Download Dialog */}
      {canPlayVideo && (
        <MediaKitDialog
          videoId={video.id}
          address={displayAddress}
          open={mediaKitOpen}
          onOpenChange={setMediaKitOpen}
        />
      )}
    </motion.div>
  );
}
