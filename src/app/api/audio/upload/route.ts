import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { nanoid } from "nanoid";

/**
 * POST /api/audio/upload
 *
 * Receives binary audio data from n8n ElevenLabs TTS and uploads to Supabase Storage.
 * Returns the public URL in AWS S3-compatible format for downstream workflow nodes.
 *
 * Security: Validates Authorization header against N8N_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  try {
    // Validate Authorization header
    const authHeader = request.headers.get("Authorization");
    const expectedSecret = process.env.N8N_WEBHOOK_SECRET;

    if (!expectedSecret) {
      console.error("N8N_WEBHOOK_SECRET environment variable not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Check for Bearer token format
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    if (token !== expectedSecret) {
      return NextResponse.json(
        { error: "Invalid authorization token" },
        { status: 401 }
      );
    }

    // Get binary data from request body
    const audioBuffer = await request.arrayBuffer();

    if (!audioBuffer || audioBuffer.byteLength === 0) {
      return NextResponse.json(
        { error: "No audio data provided" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0];
    const fileName = `audio_${nanoid(8)}_${timestamp}.mp3`;

    // Upload to Supabase Storage
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase.storage
      .from("audio-files")
      .upload(fileName, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: false,
      });

    if (error) {
      console.error("Supabase storage upload error:", error);
      return NextResponse.json(
        { error: `Upload failed: ${error.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("audio-files")
      .getPublicUrl(data.path);

    // Return in S3-compatible format (Location field) for n8n workflow compatibility
    return NextResponse.json({
      Location: urlData.publicUrl,
      Key: data.path,
      Bucket: "audio-files",
    });
  } catch (error) {
    console.error("Audio upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
