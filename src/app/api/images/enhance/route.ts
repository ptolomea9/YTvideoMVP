import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EnhancementPreset } from "@/lib/wizard/types";

/**
 * Enhancement preset mappings to Kie.ai prompts/models.
 * These prompts describe the visual transformation for each preset.
 */
const ENHANCEMENT_PROMPTS: Record<Exclude<EnhancementPreset, "original">, string> = {
  golden_hour:
    "Transform this real estate photo with warm golden hour lighting. Add soft warm sunlight, enhance the sky with sunset colors, make the scene feel inviting and luxurious with amber and gold tones. Maintain architectural details.",
  hdr:
    "Enhance this real estate photo with HDR-style processing. Boost dynamic range, bring out shadow details, enhance highlights, improve clarity and sharpness. Make the image look professional and magazine-quality.",
  vivid:
    "Enhance this real estate photo with vivid, saturated colors. Boost color vibrancy, increase contrast, make colors pop while keeping the image natural-looking. Emphasize the richness of materials and finishes.",
};

/**
 * POST /api/images/enhance
 *
 * Applies image enhancement using Kie.ai API.
 * Takes an image URL and enhancement preset, returns enhanced image URL.
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { imageUrl, preset } = body as {
      imageUrl: string;
      preset: EnhancementPreset;
    };

    if (!imageUrl || !preset) {
      return NextResponse.json(
        { error: "Missing imageUrl or preset" },
        { status: 400 }
      );
    }

    if (preset === "original") {
      return NextResponse.json(
        { error: "Cannot enhance with 'original' preset" },
        { status: 400 }
      );
    }

    // Get the enhancement prompt
    const prompt = ENHANCEMENT_PROMPTS[preset];

    // Check for Kie.ai API key
    const kieApiKey = process.env.KIE_API_KEY;
    if (!kieApiKey) {
      console.error("KIE_API_KEY not configured");
      return NextResponse.json(
        { error: "Enhancement service not configured" },
        { status: 503 }
      );
    }

    // Call Kie.ai API
    // Using their image-to-image endpoint with the nano-banana model
    const kieResponse = await fetch("https://api.kie.ai/v1/images/transform", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${kieApiKey}`,
      },
      body: JSON.stringify({
        model: "nano-banana", // The same model used for resize in n8n
        image_url: imageUrl,
        prompt: prompt,
        output_format: "url",
      }),
    });

    if (!kieResponse.ok) {
      const errorText = await kieResponse.text();
      console.error("Kie.ai API error:", kieResponse.status, errorText);
      return NextResponse.json(
        { error: "Enhancement failed" },
        { status: 500 }
      );
    }

    const kieResult = await kieResponse.json();
    const enhancedUrl = kieResult.output_url || kieResult.url;

    if (!enhancedUrl) {
      console.error("Kie.ai response missing URL:", kieResult);
      return NextResponse.json(
        { error: "Enhancement failed - no output URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      enhancedUrl,
      preset,
    });
  } catch (error) {
    console.error("Image enhancement error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Enhancement failed" },
      { status: 500 }
    );
  }
}
