import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";

/**
 * POST /api/images/get-upload-url
 *
 * Returns a signed upload URL for direct-to-Supabase uploads.
 * This bypasses the API body size limit by having clients upload directly to storage.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { filename, contentType } = body;

    if (!filename) {
      return NextResponse.json(
        { error: "Filename is required" },
        { status: 400 }
      );
    }

    // Generate unique path
    const ext = filename.split(".").pop() || "jpg";
    const filePath = `${user.id}/${nanoid()}.${ext}`;

    // Create signed upload URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from("listing-images")
      .createSignedUploadUrl(filePath);

    if (error) {
      console.error("Failed to create signed URL:", error);
      return NextResponse.json(
        { error: "Failed to create upload URL" },
        { status: 500 }
      );
    }

    // Get the public URL for after upload
    const { data: urlData } = supabase.storage
      .from("listing-images")
      .getPublicUrl(filePath);

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: filePath,
      publicUrl: urlData.publicUrl,
    });
  } catch (error) {
    console.error("Get upload URL error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get upload URL" },
      { status: 500 }
    );
  }
}
