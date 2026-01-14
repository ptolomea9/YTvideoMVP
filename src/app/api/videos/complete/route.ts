import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * POST /api/videos/complete
 * Completion webhook endpoint for n8n video generation callbacks.
 *
 * This endpoint receives callbacks from n8n when video generation completes
 * (either successfully or with an error) and updates the database accordingly.
 *
 * Security: Validates Authorization header against N8N_WEBHOOK_SECRET.
 */

interface CompletionPayload {
  video_id: string;
  video_url: string;
  thumbnail_url?: string;
  status: "completed" | "failed";
  error_message?: string;
  execution_id: string;
}

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

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    if (token !== expectedSecret) {
      return NextResponse.json(
        { error: "Invalid authorization token" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = (await request.json()) as CompletionPayload;

    // Validate required fields
    if (!body.video_id) {
      return NextResponse.json(
        { error: "Missing required field: video_id" },
        { status: 400 }
      );
    }

    if (!body.status || !["completed", "failed"].includes(body.status)) {
      return NextResponse.json(
        { error: "Missing or invalid status. Must be 'completed' or 'failed'" },
        { status: 400 }
      );
    }

    if (body.status === "completed" && !body.video_url) {
      return NextResponse.json(
        { error: "Missing required field: video_url (required for completed status)" },
        { status: 400 }
      );
    }

    if (body.status === "failed" && !body.error_message) {
      return NextResponse.json(
        { error: "Missing required field: error_message (required for failed status)" },
        { status: 400 }
      );
    }

    if (!body.execution_id) {
      return NextResponse.json(
        { error: "Missing required field: execution_id" },
        { status: 400 }
      );
    }

    // Use service role client to bypass RLS (server-to-server callback)
    const supabase = createServiceRoleClient();

    // Check if video exists
    const { data: existingVideo, error: fetchError } = await supabase
      .from("videos")
      .select("id")
      .eq("id", body.video_id)
      .single();

    if (fetchError || !existingVideo) {
      return NextResponse.json(
        { error: `Video not found: ${body.video_id}` },
        { status: 404 }
      );
    }

    // Build update object based on status
    const updateData: Record<string, unknown> = {
      status: body.status,
      n8n_execution_id: body.execution_id,
    };

    if (body.status === "completed") {
      // For completed videos, set the branded_url (unbranded deferred per 03-CONTEXT.md)
      updateData.branded_url = body.video_url;
      updateData.thumbnail_url = body.thumbnail_url || null;
      updateData.error_message = null; // Clear any previous error
    } else {
      // For failed videos, set the error message
      updateData.error_message = body.error_message;
    }

    // Update video record
    const { error: updateError } = await supabase
      .from("videos")
      .update(updateData)
      .eq("id", body.video_id);

    if (updateError) {
      console.error("Database update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update video record" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      videoId: body.video_id,
      status: body.status,
    });
  } catch (error) {
    console.error("Completion webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
