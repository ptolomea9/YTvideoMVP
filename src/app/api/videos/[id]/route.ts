import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * DELETE /api/videos/[id]
 *
 * Delete a video and its associated listing.
 * Only the owner can delete their videos.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the video exists and belongs to the user
    const { data: video, error: fetchError } = await supabase
      .from("videos")
      .select("id, listing_id, user_id")
      .eq("id", id)
      .single();

    if (fetchError || !video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    if (video.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete the video (this should cascade or we handle listing separately)
    const { error: deleteVideoError } = await supabase
      .from("videos")
      .delete()
      .eq("id", id);

    if (deleteVideoError) {
      console.error("Error deleting video:", deleteVideoError);
      return NextResponse.json(
        { error: "Failed to delete video" },
        { status: 500 }
      );
    }

    // Also delete the associated listing
    if (video.listing_id) {
      const { error: deleteListingError } = await supabase
        .from("listings")
        .delete()
        .eq("id", video.listing_id);

      if (deleteListingError) {
        // Log but don't fail - video is already deleted
        console.error("Error deleting listing:", deleteListingError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete video error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete" },
      { status: 500 }
    );
  }
}
