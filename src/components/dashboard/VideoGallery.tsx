'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { VideoCard } from './VideoCard';
import { VideoPlayerDialog } from './VideoPlayerDialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CheckSquare, Loader2, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const router = useRouter();

  // Toggle selection for a single video
  const handleToggleSelect = useCallback((videoId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  }, []);

  // Select or deselect all videos
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === videos.length) {
      setSelectedIds(new Set()); // Deselect all
    } else {
      setSelectedIds(new Set(videos.map((v) => v.id))); // Select all
    }
  }, [selectedIds.size, videos]);

  // Exit selection mode
  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  // Handle video deletion
  const handleDelete = useCallback(async (videoId: string) => {
    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete video');
      }

      // Remove from local state
      setVideos((current) => current.filter((v) => v.id !== videoId));

      // Close dialog if this video was selected
      if (selectedVideo?.id === videoId) {
        setSelectedVideo(null);
      }

      toast.success('Video deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete video');
    }
  }, [selectedVideo]);

  // Handle bulk deletion
  const handleBulkDelete = useCallback(async () => {
    const idsToDelete = Array.from(selectedIds);
    if (idsToDelete.length === 0) return;

    setIsBulkDeleting(true);
    let successCount = 0;
    let failCount = 0;

    // Delete sequentially to avoid overwhelming the API
    for (const id of idsToDelete) {
      try {
        const response = await fetch(`/api/videos/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setVideos((current) => current.filter((v) => v.id !== id));
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setIsBulkDeleting(false);
    setShowBulkDeleteConfirm(false);
    exitSelectionMode();

    if (failCount === 0) {
      toast.success(`Deleted ${successCount} video${successCount > 1 ? 's' : ''}`);
    } else {
      toast.error(`Deleted ${successCount}, failed to delete ${failCount}`);
    }
  }, [selectedIds, exitSelectionMode]);

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
      {/* Selection mode header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-muted-foreground">
          {videos.length} video{videos.length !== 1 ? 's' : ''}
        </div>
        {!isSelectionMode ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSelectionMode(true)}
            className="gap-2"
          >
            <CheckSquare className="w-4 h-4" />
            Select
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedIds.size} selected
            </span>
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              {selectedIds.size === videos.length ? 'Deselect All' : 'Select All'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={selectedIds.size === 0 || isBulkDeleting}
              onClick={() => setShowBulkDeleteConfirm(true)}
            >
              {isBulkDeleting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Delete Selected
            </Button>
            <Button variant="ghost" size="sm" onClick={exitSelectionMode}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            onSelect={() => setSelectedVideo(video)}
            onDelete={handleDelete}
            isSelectionMode={isSelectionMode}
            isSelected={selectedIds.has(video.id)}
            onToggleSelect={handleToggleSelect}
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

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} video{selectedIds.size > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected video{selectedIds.size > 1 ? 's' : ''} and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
