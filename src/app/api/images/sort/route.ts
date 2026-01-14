import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeImages, type RoomType } from "@/lib/openai";

/**
 * POST /api/images/sort
 *
 * Analyzes images using GPT-4o Vision to generate descriptive labels and features.
 * Expects JSON body with imageUrls array of {url, filename} objects.
 * Returns analyzed images sorted for video sequence with editable labels.
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
    const validUrls = imageUrls.filter((img) => {
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
      console.warn("OPENAI_API_KEY not set, returning mock analysis");
      // Return mock analysis for development/testing
      // Order: exterior → entry → living → kitchen → outdoor → bedrooms → bathrooms
      const mockLabels = [
        { label: "Elegant Front Exterior", roomType: "exterior", features: ["Grand entrance", "Manicured lawn"] },
        { label: "Welcoming Foyer", roomType: "entry", features: ["High ceilings", "Natural light"] },
        { label: "Spacious Living Room", roomType: "living", features: ["Open concept", "Fireplace"] },
        { label: "Gourmet Kitchen", roomType: "kitchen", features: ["Granite counters", "Stainless appliances"] },
        { label: "Private Backyard Oasis", roomType: "outdoor", features: ["Pool", "Covered patio"] },
        { label: "Master Suite Retreat", roomType: "master_bedroom", features: ["En-suite bathroom", "Walk-in closet"] },
      ];
      const mockAnalyzed = validUrls.map((img, idx) => ({
        url: img.url,
        filename: img.filename,
        ...mockLabels[idx % mockLabels.length],
      }));
      return NextResponse.json({ analyzed: mockAnalyzed });
    }

    // Analyze images using GPT-4o Vision
    const analyzed = await analyzeImages(validUrls);

    // Sort by room type order for video sequence
    // Flow: Exterior (curb appeal) → Interior common areas → Outdoor (backyard) → Private spaces
    // This creates a natural tour: approach house → enter → explore living spaces → step outside → retreat to bedrooms
    const roomTypeOrder: RoomType[] = [
      "exterior",      // Front of house - curb appeal
      "entry",         // Step inside - foyer/entryway
      "living",        // Main living area
      "kitchen",       // Kitchen
      "dining",        // Dining area
      "outdoor",       // Backyard/patio - before private spaces
      "master_bedroom", // Master suite
      "bedroom",       // Other bedrooms
      "bathroom",      // Bathrooms
      "other",         // Miscellaneous
    ];

    const sorted = [...analyzed].sort((a, b) => {
      return roomTypeOrder.indexOf(a.roomType) - roomTypeOrder.indexOf(b.roomType);
    });

    return NextResponse.json({ analyzed: sorted });
  } catch (error) {
    console.error("Image analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
