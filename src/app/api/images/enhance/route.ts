import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EnhancementPreset } from "@/lib/wizard/types";

/**
 * Enhancement preset mappings to Kie.ai prompts/models.
 * These prompts describe the visual transformation for each preset.
 */
const ENHANCEMENT_PROMPTS: Record<Exclude<EnhancementPreset, "original">, string> = {
  golden_hour:
    "Transform this real estate photo with warm golden hour lighting. Add soft warm sunlight, enhance the sky with sunset colors, make the scene feel inviting and luxurious with amber and gold tones. Maintain architectural details and keep the same composition.",
  sunset_sky:
    "Replace ONLY the sky in this real estate photo with a beautiful golden sunset sky with warm orange and pink clouds. Keep the property, landscaping, driveway, and all foreground elements exactly as they are - do not modify anything except the sky area. The sky replacement should look natural and blend seamlessly with the existing lighting on the property.",
  hdr:
    "Enhance this real estate photo with HDR-style processing. Boost dynamic range, bring out shadow details, enhance highlights, improve clarity and sharpness. Make the image look professional and magazine-quality while keeping the same composition.",
  vivid:
    "Enhance this real estate photo with vivid, saturated colors. Boost color vibrancy, increase contrast, make colors pop while keeping the image natural-looking. Emphasize the richness of materials and finishes.",
};

const KIE_CREATE_TASK_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_RECORD_INFO_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";
const MAX_POLL_ATTEMPTS = 30; // Max 30 attempts
const POLL_INTERVAL_MS = 2000; // 2 seconds between polls

/**
 * Helper to poll Kie.ai for task completion.
 */
async function pollForResult(
  taskId: string,
  kieApiKey: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    // Wait before polling (except first attempt)
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    const pollResponse = await fetch(`${KIE_RECORD_INFO_URL}?taskId=${taskId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${kieApiKey}`,
      },
    });

    if (!pollResponse.ok) {
      console.error("Kie.ai poll error:", pollResponse.status);
      continue;
    }

    const pollResult = await pollResponse.json();
    console.log("Kie.ai poll result:", JSON.stringify(pollResult).slice(0, 200));

    // Check status
    if (pollResult.data?.status === "success") {
      // Parse resultJson to get the URL
      try {
        const resultJson = JSON.parse(pollResult.data.resultJson);
        const resultUrl = resultJson.resultUrls?.[0];
        if (resultUrl) {
          return { success: true, url: resultUrl };
        }
      } catch (parseError) {
        console.error("Failed to parse resultJson:", parseError);
      }
    } else if (pollResult.data?.status === "failed") {
      return { success: false, error: "Enhancement task failed" };
    }
    // Otherwise status is "pending" or "processing", continue polling
  }

  return { success: false, error: "Enhancement timed out" };
}

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

    // Step 1: Create the enhancement task
    console.log("Creating Kie.ai task for preset:", preset);
    const createResponse = await fetch(KIE_CREATE_TASK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${kieApiKey}`,
      },
      body: JSON.stringify({
        model: "google/nano-banana-edit",
        input: {
          image_urls: [imageUrl],
          prompt: prompt,
          output_format: "png",
        },
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error("Kie.ai createTask error:", createResponse.status, errorText);
      return NextResponse.json(
        { error: "Failed to create enhancement task" },
        { status: 500 }
      );
    }

    const createResult = await createResponse.json();
    console.log("Kie.ai createTask result:", JSON.stringify(createResult).slice(0, 200));

    const taskId = createResult.data?.taskId;
    if (!taskId) {
      console.error("Kie.ai response missing taskId:", createResult);
      return NextResponse.json(
        { error: "Enhancement failed - no task ID" },
        { status: 500 }
      );
    }

    // Step 2: Poll for result
    console.log("Polling for task:", taskId);
    const result = await pollForResult(taskId, kieApiKey);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Enhancement failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      enhancedUrl: result.url,
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
