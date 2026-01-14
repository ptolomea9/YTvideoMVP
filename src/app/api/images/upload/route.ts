import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";

/**
 * POST /api/images/upload
 *
 * Uploads images to Supabase Storage.
 * Expects multipart/form-data with "images" field containing files.
 * Returns array of public URLs for uploaded images.
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
    const files = formData.getAll("images") as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No images provided" },
        { status: 400 }
      );
    }

    // Upload each file to Supabase Storage
    const uploadPromises = files.map(async (file) => {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${user.id}/${nanoid()}.${ext}`;

      const { data, error } = await supabase.storage
        .from("listing-images")
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        console.error("Upload error:", error);
        throw new Error(`Failed to upload ${file.name}: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("listing-images")
        .getPublicUrl(data.path);

      return {
        url: urlData.publicUrl,
        filename: file.name,
        path: data.path,
      };
    });

    const results = await Promise.all(uploadPromises);

    return NextResponse.json({
      urls: results,
    });
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
