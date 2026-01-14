import { NextResponse } from "next/server";
import * as mm from "music-metadata";

/**
 * POST /api/audio/duration
 *
 * Fetches an audio file from URL and returns its duration.
 * Used by n8n workflow to calculate audio timing for video sync.
 *
 * Expects JSON body: { "url": "https://..." }
 * Returns: { "data": { "url": "...", "duration": 5.23 } }
 */
export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const audioUrl = body.url;

    if (!audioUrl || typeof audioUrl !== "string") {
      return NextResponse.json(
        { error: "Missing required field: url" },
        { status: 400 }
      );
    }

    // Fetch the audio file
    const audioResponse = await fetch(audioUrl);

    if (!audioResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch audio: ${audioResponse.statusText}` },
        { status: 400 }
      );
    }

    // Get the audio buffer
    const audioBuffer = await audioResponse.arrayBuffer();
    const buffer = Buffer.from(audioBuffer);

    // Parse metadata to get duration
    const metadata = await mm.parseBuffer(buffer, {
      mimeType: "audio/mpeg",
    });

    const duration = metadata.format.duration || 0;

    // Return in format expected by n8n workflow (matching backend.edgeairealty.com response)
    return NextResponse.json({
      data: {
        url: audioUrl,
        duration: Math.round(duration * 1000) / 1000, // Round to 3 decimal places
      },
    });
  } catch (error) {
    console.error("Audio duration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
