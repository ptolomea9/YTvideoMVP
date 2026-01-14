import { NextResponse } from "next/server";
import { fetchUserVoices, normalizeUserVoice } from "@/lib/elevenlabs/client";

/**
 * GET /api/voices/my-voices
 * Fetches user's voices from ElevenLabs (cloned voices by default)
 */
export async function GET(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "ElevenLabs API key not configured" },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "cloned";

    const response = await fetchUserVoices(apiKey, category);

    // Normalize and return voices
    const voices = response.voices.map(normalizeUserVoice);

    return NextResponse.json({
      voices,
      has_more: response.has_more,
      total_count: response.total_count,
    });
  } catch (error) {
    console.error("Error fetching user voices:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch voices" },
      { status: 500 }
    );
  }
}
