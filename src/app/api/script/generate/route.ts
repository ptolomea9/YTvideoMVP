import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { nanoid } from "nanoid";
import type { ScriptSectionType, RoomType } from "@/lib/wizard/types";

/**
 * Get OpenAI client instance.
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
 * Section configuration for grouping images and generating narrative.
 */
const SECTION_CONFIG: {
  type: ScriptSectionType;
  title: string;
  roomTypes: RoomType[];
}[] = [
  { type: "opening", title: "Opening", roomTypes: ["exterior"] },
  { type: "living", title: "Living Spaces", roomTypes: ["entry", "living", "kitchen", "dining"] },
  { type: "private", title: "Private Retreat", roomTypes: ["master_bedroom", "bedroom", "bathroom"] },
  { type: "outdoor", title: "Outdoor Living", roomTypes: ["outdoor"] },
  { type: "closing", title: "Closing", roomTypes: [] }, // No images, CTA only
];

/**
 * Input types for the API.
 */
interface PropertyInput {
  address: string;
  city: string;
  state: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  propertyType: string;
  description: string;
  features: string[]; // Neighborhood POIs
  agentPhone?: string;
  agentSocial?: string;
}

interface ImageInput {
  id: string;
  label: string;
  features: string[];
  roomType: RoomType;
}

interface GeneratedSection {
  type: ScriptSectionType;
  title: string;
  content: string;
  imageIds: string[];
}

/**
 * POST /api/script/generate
 *
 * Generate a cohesive 5-section narration script based on property data and images.
 */
export async function POST(request: NextRequest) {
  try {
    const { propertyData, images } = await request.json() as {
      propertyData: PropertyInput;
      images: ImageInput[];
    };

    // Validate inputs
    if (!propertyData || !images || images.length === 0) {
      return NextResponse.json(
        { error: "Property data and images are required" },
        { status: 400 }
      );
    }

    // Group images by section
    const sectionGroups = new Map<ScriptSectionType, ImageInput[]>();
    for (const section of SECTION_CONFIG) {
      sectionGroups.set(section.type, []);
    }

    for (const image of images) {
      // Find the section this image belongs to
      let placed = false;
      for (const section of SECTION_CONFIG) {
        if (section.roomTypes.includes(image.roomType)) {
          sectionGroups.get(section.type)!.push(image);
          placed = true;
          break;
        }
      }
      // Default "other" to living section
      if (!placed) {
        sectionGroups.get("living")!.push(image);
      }
    }

    // Build the GPT-4 prompt
    const prompt = buildScriptPrompt(propertyData, sectionGroups);

    // Call GPT-4
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a luxury real estate video script writer. You create compelling, cinematic narration scripts for property tour videos. Your tone is sophisticated but warm, painting vivid pictures of lifestyle and luxury. Each section should flow naturally into the next, creating a cohesive tour experience.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 2000,
      temperature: 0.7, // Creative but consistent
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from GPT-4");
    }

    // Parse the JSON response
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
    }

    const generated = JSON.parse(jsonStr) as {
      sections: { type: ScriptSectionType; content: string }[];
    };

    // Build the response sections with metadata
    const sections: GeneratedSection[] = SECTION_CONFIG.map((config, index) => {
      const generatedSection = generated.sections.find((s) => s.type === config.type);
      const imagesInSection = sectionGroups.get(config.type) || [];

      return {
        type: config.type,
        title: config.title,
        content: generatedSection?.content || "",
        imageIds: imagesInSection.map((img) => img.id),
      };
    });

    // Return sections with IDs and order
    const responseSections = sections.map((section, idx) => ({
      id: nanoid(),
      type: section.type,
      title: section.title,
      content: section.content,
      originalContent: section.content,
      imageIds: section.imageIds,
      order: idx,
    }));

    return NextResponse.json({ sections: responseSections });
  } catch (error) {
    console.error("Script generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate script" },
      { status: 500 }
    );
  }
}

/**
 * Build the prompt for GPT-4 script generation.
 */
function buildScriptPrompt(
  property: PropertyInput,
  sectionGroups: Map<ScriptSectionType, ImageInput[]>
): string {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(price);

  // Build section context
  const sectionDescriptions: string[] = [];

  // Opening section
  const openingImages = sectionGroups.get("opening") || [];
  sectionDescriptions.push(`
**OPENING SECTION** (Exterior/Curb Appeal)
Images: ${openingImages.length > 0 ? openingImages.map((img) => `"${img.label}" (${img.features.join(", ")})`).join("; ") : "None"}
Goal: Attention-grabbing hook with property type and standout exterior feature. Set the tone.
`);

  // Living section
  const livingImages = sectionGroups.get("living") || [];
  sectionDescriptions.push(`
**LIVING SPACES SECTION** (Entry, Living, Kitchen, Dining)
Images: ${livingImages.length > 0 ? livingImages.map((img) => `"${img.label}" (${img.features.join(", ")})`).join("; ") : "None"}
Goal: Flow through main living areas, referencing specific image labels and features naturally.
`);

  // Private section
  const privateImages = sectionGroups.get("private") || [];
  sectionDescriptions.push(`
**PRIVATE RETREAT SECTION** (Bedrooms, Bathrooms)
Images: ${privateImages.length > 0 ? privateImages.map((img) => `"${img.label}" (${img.features.join(", ")})`).join("; ") : "None"}
Goal: Intimate, restful spaces. Highlight master suite and spa-like features.
`);

  // Outdoor section
  const outdoorImages = sectionGroups.get("outdoor") || [];
  const neighborhoodPOIs = property.features.length > 0
    ? `Neighborhood POIs to mention: ${property.features.join(", ")}`
    : "";
  sectionDescriptions.push(`
**OUTDOOR LIVING SECTION** (Backyard, Amenities, Neighborhood)
Images: ${outdoorImages.length > 0 ? outdoorImages.map((img) => `"${img.label}" (${img.features.join(", ")})`).join("; ") : "None"}
${neighborhoodPOIs}
Goal: Outdoor lifestyle, entertaining potential, and neighborhood conveniences.
`);

  // Closing section - include agent contact if available
  const agentContactInfo: string[] = [];
  if (property.agentPhone) {
    agentContactInfo.push(`Phone: ${property.agentPhone}`);
  }
  if (property.agentSocial) {
    agentContactInfo.push(`Social: ${property.agentSocial}`);
  }
  const agentContext = agentContactInfo.length > 0
    ? `\nAgent contact to reference: ${agentContactInfo.join(", ")}\nNote: A contact card with agent info will appear after this section, so the narration should set up a seamless transition to that visual.`
    : "";

  sectionDescriptions.push(`
**CLOSING SECTION** (Call-to-Action)
No images - this wraps up the tour.${agentContext}
Goal: Compelling summary and CTA with property address. Create urgency. End with a clear call to action inviting viewers to reach out.
`);

  return `Create a cinematic video narration script for this property:

**PROPERTY DETAILS:**
- Address: ${property.address}, ${property.city}, ${property.state}
- Type: ${property.propertyType}
- Price: ${formatPrice(property.price)}
- Specs: ${property.beds} beds | ${property.baths} baths | ${property.sqft.toLocaleString()} sq ft
- Description: ${property.description || "Luxury property"}

**SCRIPT REQUIREMENTS:**
- Each section should be 40-60 words (~12-18 seconds of narration)
- Total script should be ~60-90 seconds
- Luxury real estate voice: sophisticated, evocative, lifestyle-focused
- Reference specific image labels and features naturally in the narrative
- Each section should flow smoothly into the next
- Opening should hook immediately
- Closing should create urgency with a strong CTA

**SECTIONS TO WRITE:**
${sectionDescriptions.join("\n")}

**OUTPUT FORMAT:**
Return a JSON object with a "sections" array containing 5 objects, each with:
- "type": the section type (opening, living, private, outdoor, closing)
- "content": the narration text for that section

Example:
{
  "sections": [
    {"type": "opening", "content": "Welcome to..."},
    {"type": "living", "content": "Step inside..."},
    {"type": "private", "content": "Retreat to..."},
    {"type": "outdoor", "content": "Step outside..."},
    {"type": "closing", "content": "Don't miss..."}
  ]
}`;
}
