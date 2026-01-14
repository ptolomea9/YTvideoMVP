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
 * Image category types from GPT-4o Vision classification.
 */
export type ImageCategory =
  | "exterior"
  | "entry"
  | "living"
  | "bedroom"
  | "bathroom"
  | "yard"
  | "other";

/**
 * Result of classifying a single image.
 */
export interface ClassifiedImage {
  url: string;
  category: ImageCategory;
  filename: string;
}

/**
 * Classify real estate images into room categories using GPT-4o Vision.
 *
 * @param imageUrls - Array of publicly accessible image URLs
 * @returns Array of classified images with categories
 */
export async function classifyImages(
  imageUrls: { url: string; filename: string }[]
): Promise<ClassifiedImage[]> {
  if (imageUrls.length === 0) {
    return [];
  }

  // Build the content array with all images
  const imageContents: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: "text",
      text: `You are analyzing real estate property photos. For each image, classify it into exactly ONE of these categories:
- exterior: Front of house, street view, driveway, garage exterior
- entry: Entryway, foyer, front door interior
- living: Living room, family room, den, great room
- bedroom: Any bedroom including master bedroom
- bathroom: Any bathroom, powder room, en-suite
- yard: Backyard, patio, pool, garden, outdoor living space
- other: Kitchen, dining room, office, utility, or anything else

Respond with a JSON array where each element has:
- "index": the 0-based index of the image (in the order provided)
- "category": one of the categories above

Example response:
[{"index": 0, "category": "exterior"}, {"index": 1, "category": "living"}]

Now classify these ${imageUrls.length} images:`,
    },
    ...imageUrls.map((img) => ({
      type: "image_url" as const,
      image_url: {
        url: img.url,
        detail: "low" as const, // Low detail is sufficient for room classification
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
      max_tokens: 1000,
      temperature: 0,
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

    const classifications = JSON.parse(jsonStr) as {
      index: number;
      category: ImageCategory;
    }[];

    // Map classifications back to images
    return imageUrls.map((img, idx) => {
      const classification = classifications.find((c) => c.index === idx);
      return {
        url: img.url,
        category: classification?.category || "other",
        filename: img.filename,
      };
    });
  } catch (error) {
    console.error("GPT-4o Vision classification error:", error);
    // Fallback: return all as "other" if classification fails
    return imageUrls.map((img) => ({
      url: img.url,
      category: "other" as ImageCategory,
      filename: img.filename,
    }));
  }
}
