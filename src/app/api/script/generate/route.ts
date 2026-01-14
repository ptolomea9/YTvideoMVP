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
 *
 * Flow: Exterior → Outdoor → Living spaces → Private spaces → Closing
 * This creates a natural tour progression:
 * - Approach the house (curb appeal)
 * - Show the grounds/outdoor spaces
 * - Enter and explore living spaces
 * - Retreat to private bedrooms/bathrooms
 * - Call to action
 */
const SECTION_CONFIG: {
  type: ScriptSectionType;
  title: string;
  roomTypes: RoomType[];
}[] = [
  { type: "opening", title: "Opening", roomTypes: ["exterior"] },
  { type: "outdoor", title: "Outdoor Living", roomTypes: ["outdoor"] },
  { type: "living", title: "Living Spaces", roomTypes: ["entry", "living", "kitchen", "dining"] },
  { type: "private", title: "Private Retreat", roomTypes: ["master_bedroom", "bedroom", "bathroom"] },
  { type: "closing", title: "Closing", roomTypes: [] }, // No images, CTA only
];

/**
 * Room type groups for logical tour segments.
 */
const ROOM_GROUPS: Record<string, RoomType[]> = {
  exterior_approach: ["exterior"],
  outdoor_amenities: ["outdoor"],
  interior_main: ["entry", "living", "kitchen", "dining"],
  interior_private: ["master_bedroom", "bedroom", "bathroom"],
};

/**
 * Get the logical group for a room type.
 */
function getRoomGroup(roomType: RoomType): string {
  for (const [group, types] of Object.entries(ROOM_GROUPS)) {
    if (types.includes(roomType)) return group;
  }
  return "other";
}

/**
 * Transition phrase suggestions based on room group changes.
 */
const TRANSITION_HINTS: Record<string, Record<string, string>> = {
  exterior_approach: {
    outdoor_amenities: "As we explore the grounds...",
    interior_main: "Step inside and discover...",
    interior_private: "Moving through to the private spaces...",
  },
  outdoor_amenities: {
    exterior_approach: "Returning to the front...",
    interior_main: "Now let's head inside...",
    interior_private: "Inside, the private quarters await...",
  },
  interior_main: {
    exterior_approach: "Back outside...",
    outdoor_amenities: "The outdoor living continues...",
    interior_private: "The private retreat begins...",
  },
  interior_private: {
    exterior_approach: "Stepping back outside...",
    outdoor_amenities: "The outdoor amenities...",
    interior_main: "Returning to the living spaces...",
  },
  other: {
    exterior_approach: "Moving on...",
    outdoor_amenities: "Continuing the tour...",
    interior_main: "Exploring further...",
    interior_private: "And finally...",
  },
};

/**
 * Transition point between images.
 */
interface TransitionPoint {
  afterImageIndex: number;
  fromGroup: string;
  toGroup: string;
  hint: string;
}

/**
 * Analyze image sequence and identify transition points.
 */
function analyzeTransitions(images: ImageInput[]): TransitionPoint[] {
  const transitions: TransitionPoint[] = [];

  for (let i = 0; i < images.length - 1; i++) {
    const currentGroup = getRoomGroup(images[i].roomType);
    const nextGroup = getRoomGroup(images[i + 1].roomType);

    if (currentGroup !== nextGroup) {
      const hint =
        TRANSITION_HINTS[currentGroup]?.[nextGroup] ||
        "Continuing our tour...";
      transitions.push({
        afterImageIndex: i,
        fromGroup: currentGroup,
        toGroup: nextGroup,
        hint,
      });
    }
  }

  return transitions;
}

/**
 * Get the section type for a room type.
 */
function getSectionForRoomType(roomType: RoomType): ScriptSectionType {
  for (const section of SECTION_CONFIG) {
    if (section.roomTypes.includes(roomType)) {
      return section.type;
    }
  }
  return "living"; // default for "other"
}

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
  order: number;
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

    // Sort images by user order
    const sortedImages = [...images].sort((a, b) => a.order - b.order);

    // Group images by section (maintaining user order within each section)
    const sectionGroups = new Map<ScriptSectionType, ImageInput[]>();
    for (const section of SECTION_CONFIG) {
      sectionGroups.set(section.type, []);
    }

    for (const image of sortedImages) {
      const sectionType = getSectionForRoomType(image.roomType);
      sectionGroups.get(sectionType)!.push(image);
    }

    // Build the GPT-4 prompt with order-aware, transition-rich approach
    const prompt = buildScriptPrompt(propertyData, sortedImages);

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
 * Uses user's image order and detects transitions between room types.
 */
function buildScriptPrompt(
  property: PropertyInput,
  sortedImages: ImageInput[]
): string {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(price);

  // Analyze transitions between images
  const transitions = analyzeTransitions(sortedImages);

  // Build image sequence description with transition markers
  let imageSequence = "";
  for (let i = 0; i < sortedImages.length; i++) {
    const img = sortedImages[i];
    const sectionType = getSectionForRoomType(img.roomType);
    imageSequence += `${i + 1}. "${img.label}" [${img.roomType} → ${sectionType}]`;
    if (img.features.length > 0) {
      imageSequence += ` - ${img.features.join(", ")}`;
    }
    imageSequence += "\n";

    // Add transition marker if this is a transition point
    const transition = transitions.find((t) => t.afterImageIndex === i);
    if (transition) {
      imageSequence += `   ↳ TRANSITION HINT: "${transition.hint}"\n`;
    }
  }

  // Neighborhood POIs instruction
  const neighborhoodPOIs =
    property.features.length > 0
      ? `\n**NEIGHBORHOOD POIs (weave naturally into outdoor/exterior moments):**\n${property.features.join(", ")}`
      : "";

  // Agent contact for closing
  const agentContact =
    property.agentPhone || property.agentSocial
      ? `\n**AGENT CONTACT (reference in closing):** ${[property.agentPhone, property.agentSocial].filter(Boolean).join(", ")}`
      : "";

  // Build transition guidelines
  const transitionGuidelines =
    transitions.length > 0
      ? transitions
          .map(
            (t) =>
              `- After image ${t.afterImageIndex + 1}: Use transition like "${t.hint}" (${t.fromGroup} → ${t.toGroup})`
          )
          .join("\n")
      : "- No major transitions needed - images flow naturally within similar spaces";

  return `Create a cinematic video narration script for this property tour.

**PROPERTY DETAILS:**
- Address: ${property.address}, ${property.city}, ${property.state}
- Type: ${property.propertyType}
- Price: ${formatPrice(property.price)}
- Specs: ${property.beds} beds | ${property.baths} baths | ${property.sqft.toLocaleString()} sq ft
- Description: ${property.description || "Luxury property"}
${neighborhoodPOIs}${agentContact}

**IMAGE SEQUENCE (in exact order to narrate):**
${imageSequence}

**CRITICAL REQUIREMENTS:**
1. **FOLLOW THE EXACT IMAGE ORDER** - The user has arranged these images intentionally. Narrate them in this sequence.
2. **SMOOTH TRANSITIONS** - When room types change between images, use natural transition phrases (hints provided above).
3. **REFERENCE EACH IMAGE** - Mention the label and key features of each image as you narrate.
4. **COHESIVE FLOW** - Despite section breaks, the narrative should feel like one continuous tour.

**TRANSITION GUIDELINES:**
${transitionGuidelines}

**SCRIPT STRUCTURE:**
- Opening (40-60 words): Hook with exterior/first images
- Outdoor (40-60 words): If outdoor images exist, describe them (can be empty if no outdoor images)
- Living Spaces (40-60 words): Interior main living areas
- Private Retreat (40-60 words): Bedrooms, bathrooms, private spaces
- Closing (40-60 words): Final CTA with property address

**IMPORTANT:** Write sections based on where images appear in the sequence. If the user has reordered images so that a bedroom appears early, the bedroom content goes in the section where it naturally fits based on the image order.

**OUTPUT FORMAT:**
Return JSON with "sections" array. Each section should contain narration for its relevant images IN THE ORDER they appear in the sequence above:

{
  "sections": [
    {"type": "opening", "content": "...narration for exterior/first images..."},
    {"type": "outdoor", "content": "...narration for outdoor images, or brief transition if none..."},
    {"type": "living", "content": "...narration for living area images..."},
    {"type": "private", "content": "...narration for private space images..."},
    {"type": "closing", "content": "...CTA with property address..."}
  ]
}

If a section has no images, write a brief (10-15 word) transitional sentence that maintains flow.`;
}
