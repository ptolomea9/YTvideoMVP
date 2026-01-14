"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Mic, Square, Play, Pause, RotateCcw } from "lucide-react";

type RecorderState =
  | "idle"
  | "requesting"
  | "ready"
  | "recording"
  | "stopped";

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  className?: string;
  minDuration?: number; // Minimum recording duration in seconds
  maxDuration?: number; // Maximum recording duration in seconds
}

/**
 * AudioRecorder - Browser-based audio recording using MediaRecorder API.
 * Provides microphone recording with playback preview.
 */
export function AudioRecorder({
  onRecordingComplete,
  className,
  minDuration = 30,
  maxDuration = 180,
}: AudioRecorderProps) {
  const [state, setState] = React.useState<RecorderState>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [duration, setDuration] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const audioUrlRef = React.useRef<string | null>(null);
  const recordedBlobRef = React.useRef<Blob | null>(null);

  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  // Request microphone permission
  const requestMicrophone = async () => {
    setState("requesting");
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;
      setState("ready");
    } catch (err) {
      console.error("Microphone access error:", err);
      setError("Microphone access denied. Please allow microphone access to record.");
      setState("idle");
    }
  };

  // Get supported MIME type
  const getSupportedMimeType = (): string => {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
      "audio/wav",
    ];
    return types.find(type => MediaRecorder.isTypeSupported(type)) || "audio/webm";
  };

  // Start recording
  const startRecording = () => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    setDuration(0);

    const mimeType = getSupportedMimeType();
    const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      recordedBlobRef.current = blob;

      // Create preview URL
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      audioUrlRef.current = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.src = audioUrlRef.current;
      }
    };

    mediaRecorder.start(1000); // Collect data every second
    setState("recording");

    // Start duration timer
    timerRef.current = setInterval(() => {
      setDuration((prev) => {
        const newDuration = prev + 1;
        // Auto-stop at max duration
        if (newDuration >= maxDuration) {
          stopRecording();
        }
        return newDuration;
      });
    }, 1000);
  };

  // Stop recording
  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    setState("stopped");
  };

  // Reset recording
  const resetRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setDuration(0);
    recordedBlobRef.current = null;
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setState("ready");
  };

  // Toggle playback
  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Handle audio ended
  const handleAudioEnded = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Use recording
  const useRecording = () => {
    if (recordedBlobRef.current && duration >= minDuration) {
      onRecordingComplete(recordedBlobRef.current, duration);
    }
  };

  const isTooShort = state === "stopped" && duration < minDuration;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Hidden audio element for playback */}
      <audio ref={audioRef} onEnded={handleAudioEnded} className="hidden" />

      {/* Error message */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Recording UI */}
      <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-muted/30 p-6">
        {/* State: Idle - Request microphone */}
        {state === "idle" && (
          <>
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Mic className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Record your voice to create a custom voice clone.
              <br />
              Minimum {minDuration} seconds recommended for best quality.
            </p>
            <Button onClick={requestMicrophone}>
              <Mic className="mr-2 h-4 w-4" />
              Enable Microphone
            </Button>
          </>
        )}

        {/* State: Requesting - Loading */}
        {state === "requesting" && (
          <>
            <div className="flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-primary/20">
              <Mic className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Requesting microphone access...
            </p>
          </>
        )}

        {/* State: Ready - Ready to record */}
        {state === "ready" && (
          <>
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20">
              <Mic className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Microphone ready. Click to start recording.
            </p>
            <Button onClick={startRecording} size="lg">
              <Mic className="mr-2 h-4 w-4" />
              Start Recording
            </Button>
          </>
        )}

        {/* State: Recording - Active recording */}
        {state === "recording" && (
          <>
            <div className="relative flex h-20 w-20 items-center justify-center">
              {/* Pulsing ring animation */}
              <div className="absolute inset-0 animate-ping rounded-full bg-destructive/20" />
              <div className="relative flex h-full w-full items-center justify-center rounded-full bg-destructive">
                <Mic className="h-8 w-8 text-destructive-foreground" />
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-mono font-bold tabular-nums">
                {formatTime(duration)}
              </span>
              <span className="text-xs text-muted-foreground">
                {duration < minDuration
                  ? `Minimum ${minDuration - duration}s more`
                  : "Recording..."}
              </span>
            </div>
            <Button
              onClick={stopRecording}
              variant="destructive"
              size="lg"
              disabled={duration < 5} // Allow stopping after 5 seconds minimum
            >
              <Square className="mr-2 h-4 w-4 fill-current" />
              Stop Recording
            </Button>
          </>
        )}

        {/* State: Stopped - Preview recording */}
        {state === "stopped" && (
          <>
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20">
              {isPlaying ? (
                <Pause className="h-8 w-8 text-primary" />
              ) : (
                <Play className="h-8 w-8 text-primary" />
              )}
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-mono font-bold tabular-nums">
                {formatTime(duration)}
              </span>
              {isTooShort && (
                <span className="text-xs text-destructive">
                  Recording too short. Minimum {minDuration} seconds required.
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={togglePlayback}
                variant="outline"
                size="lg"
              >
                {isPlaying ? (
                  <>
                    <Pause className="mr-2 h-4 w-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Preview
                  </>
                )}
              </Button>
              <Button
                onClick={resetRecording}
                variant="outline"
                size="lg"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Re-record
              </Button>
            </div>
            {!isTooShort && (
              <Button onClick={useRecording} size="lg" className="mt-2">
                Use This Recording
              </Button>
            )}
          </>
        )}
      </div>

      {/* Recording tips */}
      {(state === "ready" || state === "recording") && (
        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">Tips for best results:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Speak naturally and clearly</li>
            <li>Record in a quiet environment</li>
            <li>Keep a consistent tone throughout</li>
            <li>30-60 seconds produces the best clones</li>
          </ul>
        </div>
      )}
    </div>
  );
}
