import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { classifyImages } from "@/lib/openai";

/**
 * POST /api/images/sort
 *
 * Classifies images using GPT-4o Vision into room categories.
 * Expects JSON body with imageUrls array of {url, filename} objects.
 * Returns categorized images sorted for video sequence.
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
    const { imageUrls } = body as {
      imageUrls: { url: string; filename: string }[];
    };

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json(
        { error: "No image URLs provided" },
        { status: 400 }
      );
    }

    // Validate that URLs belong to the authenticated user's uploads
    // (URLs should contain the user ID in the path)
    const validUrls = imageUrls.filter((img) => {
      // Supabase Storage URLs contain the user ID in the path
      // e.g., .../listing-images/user-id/image.jpg
      return img.url.includes(user.id) || img.url.includes("listing-images");
    });

    if (validUrls.length === 0) {
      return NextResponse.json(
        { error: "No valid image URLs for this user" },
        { status: 400 }
      );
    }

    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OPENAI_API_KEY not set, returning mock classification");
      // Return mock classification for development/testing
      const mockCategories = [
        "exterior",
        "entry",
        "living",
        "bedroom",
        "bathroom",
        "yard",
      ];
      const mockCategorized = validUrls.map((img, idx) => ({
        url: img.url,
        filename: img.filename,
        category: mockCategories[idx % mockCategories.length],
      }));
      return NextResponse.json({ categorized: mockCategorized });
    }

    // Classify images using GPT-4o Vision
    const categorized = await classifyImages(validUrls);

    // Sort by category order for video sequence
    const categoryOrder = [
      "exterior",
      "entry",
      "living",
      "bedroom",
      "bathroom",
      "yard",
      "other",
    ];

    const sorted = [...categorized].sort((a, b) => {
      return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
    });

    return NextResponse.json({ categorized: sorted });
  } catch (error) {
    console.error("Image classification error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Classification failed" },
      { status: 500 }
    );
  }
}
