import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";

/**
 * POST /api/branding/upload
 *
 * Uploads agent branding images (logo or headshot) to Supabase Storage.
 * Expects multipart/form-data with:
 * - "file": The image file
 * - "type": "logo" or "photo"
 *
 * Returns the public URL for the uploaded image.
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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!type || !["logo", "photo"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be 'logo' or 'photo'" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Must be JPEG, PNG, or WebP" },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB" },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `branding/${user.id}/${type}-${nanoid()}.${ext}`;

    const { data, error } = await supabase.storage
      .from("listing-images")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Branding upload error:", error);
      return NextResponse.json(
        { error: `Failed to upload: ${error.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("listing-images")
      .getPublicUrl(data.path);

    const publicUrl = urlData.publicUrl;

    // Save to user profile for persistence across sessions
    const existingBranding = (user.user_metadata?.branding as Record<string, string>) || {};
    const brandingUpdate = {
      ...existingBranding,
      [type === "photo" ? "headshot_url" : "logo_url"]: publicUrl,
    };

    await supabase.auth.updateUser({
      data: { branding: brandingUpdate },
    });

    return NextResponse.json({
      url: publicUrl,
      type,
      persisted: true,
    });
  } catch (error) {
    console.error("Branding upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
