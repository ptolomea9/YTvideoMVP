import { NextResponse } from "next/server";
import { fetchSharedVoices, normalizeSharedVoice } from "@/lib/elevenlabs/client";
import type { VoiceLibraryFilters } from "@/lib/elevenlabs/types";

/**
 * GET /api/voices/library
 * Fetches shared voices from ElevenLabs voice library with filters
 *
 * Query parameters:
 * - gender: string (e.g., "male", "female")
 * - age: string (e.g., "young", "middle_aged", "old")
 * - accent: string (e.g., "american", "british")
 * - language: string (e.g., "en", "es")
 * - use_cases: string (comma-separated, e.g., "narrative_story,conversational")
 * - search: string - Search term
 * - page: number - Page number (0-indexed)
 * - page_size: number - Results per page (default: 20, max: 100)
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

    const filters: VoiceLibraryFilters = {
      gender: searchParams.get("gender") || undefined,
      age: searchParams.get("age") || undefined,
      accent: searchParams.get("accent") || undefined,
      language: searchParams.get("language") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!) : undefined,
      page_size: searchParams.get("page_size")
        ? Math.min(parseInt(searchParams.get("page_size")!), 100)
        : 20,
    };

    // Parse use_cases from comma-separated string
    const useCasesParam = searchParams.get("use_cases");
    if (useCasesParam) {
      filters.use_cases = useCasesParam.split(",").filter(Boolean);
    }

    const response = await fetchSharedVoices(apiKey, filters);

    // Normalize and return voices
    const voices = response.voices.map(normalizeSharedVoice);

    return NextResponse.json({
      voices,
      has_more: response.has_more,
    });
  } catch (error) {
    console.error("Error fetching voice library:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch voice library" },
      { status: 500 }
    );
  }
}
