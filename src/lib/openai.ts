import OpenAI from "openai";

/**
 * Get OpenAI client instance.
 * Lazily initialized to avoid build-time errors when API key is not set.
 */
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

/**
 * Room type for sequencing (broad categories for video order).
 */
export type RoomType =
  | "exterior"
  | "entry"
  | "living"
  | "kitchen"
  | "dining"
  | "master_bedroom"
  | "guest_bedroom"    // Guest bedroom (distinct from master)
  | "bedroom"
  | "bathroom"
  | "home_office"      // Home office/study
  | "outdoor"
  | "other";

/**
 * Result of analyzing a single image with descriptive label.
 */
export interface AnalyzedImage {
  url: string;
  filename: string;
  label: string;        // AI-generated descriptive label (editable by user)
  roomType: RoomType;   // Broad category for video sequencing
  features: string[];   // Notable features for script generation
}

/**
 * Analyze real estate images using GPT-4o Vision.
 * Returns descriptive labels and features for each image.
 *
 * @param imageUrls - Array of publicly accessible image URLs
 * @returns Array of analyzed images with labels and features
 */
export async function analyzeImages(
  imageUrls: { url: string; filename: string }[]
): Promise<AnalyzedImage[]> {
  if (imageUrls.length === 0) {
    return [];
  }

  // Build the content array with all images
  const imageContents: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: "text",
      text: `You are a luxury real estate marketing expert analyzing property photos for a video tour.

For each image, provide:
1. A descriptive label (2-5 words) that captures what makes this space special
   - Be specific: "Master Suite with Coffered Ceiling" not just "Bedroom"
   - Highlight unique features: "Gourmet Kitchen with Marble Island", "Private Dock with Boat Lift"
   - For bedrooms: distinguish "Master Bedroom/Suite" from "Guest Bedroom", "Kids Room", etc.

2. A room type for video sequencing (one of: exterior, entry, living, kitchen, dining, master_bedroom, guest_bedroom, bedroom, bathroom, home_office, outdoor, other)

3. Notable features that should be mentioned in narration (2-4 bullet points)

Respond with a JSON array where each element has:
- "index": the 0-based index of the image
- "label": descriptive label for this space
- "roomType": one of the room types listed above
- "features": array of notable features as strings

Example response:
[
  {"index": 0, "label": "Mediterranean Villa Exterior", "roomType": "exterior", "features": ["Spanish tile roof", "Circular driveway", "Mature palm trees"]},
  {"index": 1, "label": "Grand Foyer with Chandelier", "roomType": "entry", "features": ["Double-height ceiling", "Crystal chandelier", "Marble flooring"]},
  {"index": 2, "label": "Master Suite with Ocean View", "roomType": "master_bedroom", "features": ["Floor-to-ceiling windows", "Private balcony", "Walk-in closet"]}
]

Now analyze these ${imageUrls.length} property images:`,
    },
    ...imageUrls.map((img) => ({
      type: "image_url" as const,
      image_url: {
        url: img.url,
        detail: "low" as const,
      },
    })),
  ];

  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: imageContents,
        },
      ],
      max_tokens: 2000,
      temperature: 0.3, // Slight creativity for better labels
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from GPT-4o Vision");
    }

    // Parse the JSON response - handle markdown code blocks
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
    }

    const analyses = JSON.parse(jsonStr) as {
      index: number;
      label: string;
      roomType: RoomType;
      features: string[];
    }[];

    // Map analyses back to images
    return imageUrls.map((img, idx) => {
      const analysis = analyses.find((a) => a.index === idx);
      return {
        url: img.url,
        filename: img.filename,
        label: analysis?.label || `Image ${idx + 1}`,
        roomType: analysis?.roomType || "other",
        features: analysis?.features || [],
      };
    });
  } catch (error) {
    console.error("GPT-4o Vision analysis error:", error);
    // Fallback: return basic labels if analysis fails
    return imageUrls.map((img, idx) => ({
      url: img.url,
      filename: img.filename,
      label: `Image ${idx + 1}`,
      roomType: "other" as RoomType,
      features: [],
    }));
  }
}
