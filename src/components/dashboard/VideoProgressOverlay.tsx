'use client';

import { motion } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';
import type { VideoStatus } from '@/types/video';

interface VideoProgressOverlayProps {
  status: VideoStatus;
  errorMessage?: string | null;
}

/**
 * Progress step configuration for each video status.
 */
const PROGRESS_STEPS: Record<VideoStatus, { step: number; label: string; percent: number }> = {
  pending: { step: 0, label: 'Queued', percent: 0 },
  processing: { step: 1, label: 'Starting...', percent: 10 },
  sorting_images: { step: 2, label: 'Sorting images', percent: 25 },
  generating_motion: { step: 3, label: 'Creating motion', percent: 45 },
  generating_audio: { step: 4, label: 'Generating narration', percent: 65 },
  rendering: { step: 5, label: 'Rendering video', percent: 85 },
  completed: { step: 6, label: 'Complete', percent: 100 },
  failed: { step: -1, label: 'Failed', percent: 0 },
};

/**
 * Statuses that show the progress overlay.
 */
const IN_PROGRESS_STATUSES: VideoStatus[] = [
  'pending',
  'processing',
  'sorting_images',
  'generating_motion',
  'generating_audio',
  'rendering',
];

/**
 * VideoProgressOverlay displays animated progress indicator for videos being generated.
 * Shows animated spinner, current step label, and progress bar.
 */
export function VideoProgressOverlay({ status, errorMessage }: VideoProgressOverlayProps) {
  const isInProgress = IN_PROGRESS_STATUSES.includes(status);
  const isFailed = status === 'failed';

  // Don't render if completed (no overlay needed)
  if (!isInProgress && !isFailed) {
    return null;
  }

  const progress = PROGRESS_STEPS[status];

  // Failed state - show error overlay
  if (isFailed) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-20">
        <div className="flex flex-col items-center gap-3 px-4 text-center">
          <div className="p-3 rounded-full bg-destructive/20">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-medium text-white mb-1">Generation failed</p>
            {errorMessage && (
              <p className="text-xs text-muted-foreground max-w-[200px] line-clamp-2">
                {errorMessage}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // In-progress state - show progress overlay
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-20">
      {/* Spinner and label */}
      <div className="flex flex-col items-center gap-3">
        {/* Animated gold spinner ring */}
        <motion.div
          className="relative w-12 h-12"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        >
          <div className="absolute inset-0 rounded-full border-2 border-gold/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold" />
        </motion.div>

        {/* Step label with fade animation */}
        <motion.p
          key={status}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-sm font-medium text-white"
        >
          {progress.label}
        </motion.p>
      </div>

      {/* Progress bar at bottom */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gold rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress.percent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <p className="text-xs text-white/60 text-center mt-2">
          {progress.percent}%
        </p>
      </div>
    </div>
  );
}
