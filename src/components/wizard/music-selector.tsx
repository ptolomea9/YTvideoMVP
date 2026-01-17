"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Play,
  Pause,
  Upload,
  Music,
  Check,
  Loader2,
  Sparkles,
  Zap,
  Waves,
  X,
} from "lucide-react";
import {
  type MusicTrack,
  type MusicEnergy,
  type MusicSelection,
  ENERGY_LABELS,
} from "@/lib/music";

interface MusicSelectorProps {
  value: MusicSelection;
  onChange: (selection: MusicSelection) => void;
  disabled?: boolean;
}

const ENERGY_ICONS: Record<MusicEnergy, React.ReactNode> = {
  low: <Waves className="h-4 w-4" />,
  medium: <Sparkles className="h-4 w-4" />,
  high: <Zap className="h-4 w-4" />,
};

export function MusicSelector({ value, onChange, disabled }: MusicSelectorProps) {
  const [tracks, setTracks] = React.useState<MusicTrack[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedEnergy, setSelectedEnergy] = React.useState<MusicEnergy>("medium");
  const [playingTrackId, setPlayingTrackId] = React.useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch tracks when energy changes
  React.useEffect(() => {
    const fetchTracks = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/music?energy=${selectedEnergy}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch music: ${response.status}`);
        }
        const data = await response.json();
        setTracks(data.tracks || []);
      } catch (error) {
        console.error("Failed to fetch music:", error);
        setTracks([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTracks();
  }, [selectedEnergy]);

  // Handle audio playback
  const togglePlay = (track: MusicTrack) => {
    if (!audioRef.current) return;

    if (playingTrackId === track.id) {
      audioRef.current.pause();
      setPlayingTrackId(null);
    } else {
      audioRef.current.src = track.previewUrl;
      audioRef.current.play();
      setPlayingTrackId(track.id);
    }
  };

  const handleAudioEnded = () => {
    setPlayingTrackId(null);
  };

  // Handle track selection
  const selectTrack = (track: MusicTrack) => {
    onChange({
      type: "library",
      trackId: track.id,
      trackUrl: track.downloadUrl,
      trackName: track.title,
    });
  };

  // Handle file upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("audio/")) {
      alert("Please upload an audio file");
      return;
    }

    setUploadedFile(file);
    setUploading(true);

    try {
      // For now, create an object URL for the uploaded file
      // In production, this would upload to S3
      const url = URL.createObjectURL(file);

      onChange({
        type: "upload",
        trackUrl: url,
        trackName: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
      });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  // Clear selection
  const clearSelection = () => {
    onChange({ type: "none" });
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden audio element */}
      <audio ref={audioRef} onEnded={handleAudioEnded} className="hidden" />

      {/* Energy Level Tabs */}
      <div className="flex gap-2">
        {(["low", "medium", "high"] as MusicEnergy[]).map((energy) => (
          <button
            key={energy}
            onClick={() => setSelectedEnergy(energy)}
            disabled={disabled}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 rounded-lg border p-3 transition-all",
              selectedEnergy === energy
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-primary/50 hover:bg-muted/50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className="flex items-center gap-1.5">
              {ENERGY_ICONS[energy]}
              <span className="font-medium text-sm">{ENERGY_LABELS[energy].label}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {ENERGY_LABELS[energy].description}
            </span>
          </button>
        ))}
      </div>

      {/* Selected Track Display */}
      {value.type !== "none" && value.trackName && (
        <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Music className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{value.trackName}</p>
              <p className="text-xs text-muted-foreground">
                {value.type === "upload" ? "Uploaded" : "Library"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={clearSelection}
            disabled={disabled}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Track List */}
      <div className="space-y-1 max-h-[240px] overflow-y-auto rounded-lg border">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : tracks.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            No tracks found
          </div>
        ) : (
          tracks.map((track) => (
            <div
              key={track.id}
              className={cn(
                "flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer",
                value.trackId === track.id && "bg-primary/5"
              )}
              onClick={() => !disabled && selectTrack(track)}
            >
              {/* Play Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay(track);
                }}
                disabled={disabled}
              >
                {playingTrackId === track.id ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{track.title}</p>
                {track.artist && (
                  <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                )}
              </div>

              {/* Duration */}
              <span className="text-xs text-muted-foreground shrink-0">
                {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, "0")}
              </span>

              {/* Selected Indicator */}
              {value.trackId === track.id && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
            </div>
          ))
        )}
      </div>

      {/* Upload Section */}
      <div className="pt-2 border-t">
        <Label className="text-sm text-muted-foreground mb-2 block">
          Or upload your own music
        </Label>
        <div className="flex gap-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            disabled={disabled || uploading}
            className="flex-1"
          />
          {uploading && <Loader2 className="h-5 w-5 animate-spin" />}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          MP3, WAV, or M4A. Max 10MB. Ensure you have rights to use the music.
        </p>
      </div>
    </div>
  );
}
