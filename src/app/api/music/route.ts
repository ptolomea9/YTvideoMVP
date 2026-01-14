import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CURATED_TRACKS, type MusicEnergy } from "@/lib/music";

/**
 * GET /api/music
 *
 * Returns music tracks filtered by energy level.
 * Fetches from database if available, falls back to curated static tracks.
 *
 * Query params:
 * - energy: "low" | "medium" | "high" (optional)
 * - search: string (optional)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const energy = searchParams.get("energy") as MusicEnergy | null;
    const search = searchParams.get("search")?.toLowerCase();

    const supabase = await createClient();

    // Try to fetch from database first
    let query = supabase
      .from("music_tracks")
      .select("*")
      .eq("is_active", true)
      .order("title");

    // Filter by energy level
    if (energy && ["low", "medium", "high"].includes(energy)) {
      query = query.eq("energy", energy);
    }

    // Filter by search term
    if (search) {
      query = query.or(`title.ilike.%${search}%,artist.ilike.%${search}%`);
    }

    const { data: dbTracks, error } = await query;

    // If database has tracks, use them
    if (!error && dbTracks && dbTracks.length > 0) {
      const tracks = dbTracks.map((track) => ({
        id: track.id,
        title: track.title,
        artist: track.artist,
        duration: track.duration,
        energy: track.energy as MusicEnergy,
        tags: track.tags || [],
        previewUrl: track.file_url || track.preview_url,
        downloadUrl: track.file_url,
        source: track.source || "library",
        // Beat data for video timing
        bpm: track.bpm,
        beats: track.beats || [],
        bassHits: track.bass_hits || [],
        snareHits: track.snare_hits || [],
      }));

      return NextResponse.json({
        tracks,
        total: tracks.length,
        source: "database",
      });
    }

    // Fallback to static curated tracks
    let tracks = [...CURATED_TRACKS];

    // Filter by energy level
    if (energy && ["low", "medium", "high"].includes(energy)) {
      tracks = tracks.filter((track) => track.energy === energy);
    }

    // Filter by search term
    if (search) {
      tracks = tracks.filter(
        (track) =>
          track.title.toLowerCase().includes(search) ||
          track.artist?.toLowerCase().includes(search) ||
          track.tags.some((tag) => tag.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({
      tracks,
      total: tracks.length,
      source: "static",
    });
  } catch (error) {
    console.error("Music API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch music" },
      { status: 500 }
    );
  }
}
