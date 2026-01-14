'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { X, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { VideoWithListing } from '@/types/video';
import { cn } from '@/lib/utils';
import { MediaKitDialog } from './MediaKitDialog';

interface VideoPlayerDialogProps {
  video: VideoWithListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Full-screen video player dialog for viewing completed videos.
 * Maintains 9:16 aspect ratio, includes native video controls,
 * and keyboard support (Space for play/pause, Escape to close).
 */
export function VideoPlayerDialog({ video, open, onOpenChange }: VideoPlayerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaKitOpen, setMediaKitOpen] = useState(false);

  // Handle space key for play/pause
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space' && videoRef.current) {
      e.preventDefault();
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  // Reset video when dialog closes
  useEffect(() => {
    if (!open && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [open]);

  if (!video) return null;

  const displayAddress = video.listing.city && video.listing.state
    ? `${video.listing.address}, ${video.listing.city}, ${video.listing.state}`
    : video.listing.address;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/90" />
        <div
          className={cn(
            'fixed inset-0 z-50 flex items-center justify-center p-4',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
          data-state={open ? 'open' : 'closed'}
        >
          {/* Video container with 9:16 aspect ratio */}
          <div className="relative w-full max-w-md h-full max-h-[90vh] flex items-center justify-center">
            <div className="relative w-full aspect-[9/16] max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl">
              {/* Header overlay */}
              <div className="absolute top-0 inset-x-0 z-20 bg-gradient-to-b from-black/70 to-transparent p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-8">
                    <h3 className="text-white font-heading text-lg font-semibold truncate">
                      {displayAddress}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMediaKitOpen(true)}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                      aria-label="Download video"
                    >
                      <Download className="w-5 h-5 text-white" />
                    </button>
                    <button
                      onClick={() => onOpenChange(false)}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                      aria-label="Close video player"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Video player */}
              {video.branded_url && (
                <video
                  ref={videoRef}
                  src={video.branded_url}
                  poster={video.thumbnail_url || undefined}
                  controls
                  autoPlay
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover bg-black"
                />
              )}
            </div>
          </div>
        </div>
      </DialogPortal>

      {/* Media Kit Download Dialog */}
      <MediaKitDialog
        videoId={video.id}
        address={displayAddress}
        open={mediaKitOpen}
        onOpenChange={setMediaKitOpen}
      />
    </Dialog>
  );
}
