import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Sanitizes an address into a filename-safe string.
 * Removes special characters, replaces spaces with dashes, lowercases.
 */
function sanitizeFilename(address: string): string {
  return address
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')         // Spaces to dashes
    .replace(/-+/g, '-')          // Collapse multiple dashes
    .slice(0, 50);                // Limit length
}

interface DownloadResponse {
  branded: {
    url: string;
    filename: string;
  };
  unbranded: {
    url: string | null;
    filename: string;
  };
}

/**
 * GET /api/videos/[id]/download
 *
 * Returns download URLs for branded and unbranded video versions.
 * Validates ownership via Supabase RLS before returning URLs.
 * Generates descriptive filenames from listing address.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Fetch video with listing (RLS ensures user can only access their own videos)
    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select(`
        id,
        status,
        branded_url,
        unbranded_url,
        listing:listings!inner(
          address,
          city,
          state
        )
      `)
      .eq("id", id)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    // Check if video is completed
    if (video.status !== 'completed') {
      return NextResponse.json(
        { error: "Video is not ready for download" },
        { status: 400 }
      );
    }

    // Check if branded URL exists
    if (!video.branded_url) {
      return NextResponse.json(
        { error: "Video URL not available" },
        { status: 400 }
      );
    }

    // Generate descriptive filenames from address
    const listing = video.listing as { address: string; city: string | null; state: string | null };
    const baseFilename = sanitizeFilename(listing.address);

    const response: DownloadResponse = {
      branded: {
        url: video.branded_url,
        filename: `${baseFilename}-branded.mp4`,
      },
      unbranded: {
        url: video.unbranded_url,
        filename: `${baseFilename}-unbranded.mp4`,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Video download error:", error);
    return NextResponse.json(
      { error: "Failed to get download URLs" },
      { status: 500 }
    );
  }
}
