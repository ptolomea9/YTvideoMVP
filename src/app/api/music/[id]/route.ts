import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/music/[id]
 *
 * Returns a single music track with full metadata including beat data.
 * Used by submission API to get track details for n8n payload.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Track ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: track, error } = await supabase
      .from("music_tracks")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .single();

    if (error || !track) {
      return NextResponse.json(
        { error: "Track not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: track.id,
      title: track.title,
      artist: track.artist,
      duration: track.duration,
      energy: track.energy,
      tags: track.tags || [],
      url: track.file_url,
      previewUrl: track.file_url || track.preview_url,
      downloadUrl: track.file_url,
      source: track.source || "library",
      // Beat data for video timing
      bpm: track.bpm,
      beats: track.beats || [],
      bassHits: track.bass_hits || [],
      snareHits: track.snare_hits || [],
    });
  } catch (error) {
    console.error("Music track fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch track" },
      { status: 500 }
    );
  }
}
