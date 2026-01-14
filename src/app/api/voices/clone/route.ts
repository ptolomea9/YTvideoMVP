import { NextResponse } from "next/server";
import { createVoiceClone } from "@/lib/elevenlabs/client";

/**
 * POST /api/voices/clone
 * Creates an instant voice clone from uploaded audio
 *
 * Request body (FormData):
 * - name: string - Name for the new voice
 * - audio: File - Audio file for cloning (30-60 seconds recommended)
 * - removeBackgroundNoise: boolean (optional) - Remove background noise
 */
export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "ElevenLabs API key not configured" },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const audio = formData.get("audio") as File;
    const removeBackgroundNoise = formData.get("removeBackgroundNoise") === "true";

    if (!name || !audio) {
      return NextResponse.json(
        { error: "Name and audio file are required" },
        { status: 400 }
      );
    }

    // Validate audio file type
    const validTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/webm", "audio/ogg"];
    if (!validTypes.some(type => audio.type.startsWith(type.split("/")[0]))) {
      return NextResponse.json(
        { error: "Invalid audio file type. Supported: MP3, WAV, WebM, OGG" },
        { status: 400 }
      );
    }

    // Convert File to Blob for the API
    const audioBlob = new Blob([await audio.arrayBuffer()], { type: audio.type });

    const response = await createVoiceClone(apiKey, name, audioBlob, removeBackgroundNoise);

    return NextResponse.json({
      voice_id: response.voice_id,
      name: name,
      requires_verification: response.requires_verification,
    });
  } catch (error) {
    console.error("Error creating voice clone:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create voice clone" },
      { status: 500 }
    );
  }
}
