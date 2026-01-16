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
 * Video clip duration from Kling AI (seconds per image).
 */
const KLING_CLIP_DURATION = 5;

/**
 * Words per minute for TTS narration.
 * Using 120 WPM (conservative) to account for slower voices.
 * Some voices speak at ~128 WPM, so this prevents narration overrun.
 */
const TTS_WORDS_PER_MINUTE = 120;

/**
 * Seconds reserved for end card (agent branding overlay).
 * Narration should finish before this to avoid being cut off.
 */
const END_CARD_SECONDS = 8;

/**
 * Default maximum total words for entire script.
 * This is overridden dynamically based on video duration in the POST handler.
 */
const DEFAULT_MAX_TOTAL_WORDS = 150;

/**
 * Calculate word budget for each section based on image count.
 * This ensures narration duration matches available video footage.
 *
 * Formula: images × 5 seconds × (120 WPM / 60) = images × 10 words
 */
interface SectionWordBudget {
  type: ScriptSectionType;
  title: string;
  imageCount: number;
  clipSeconds: number;
  targetWords: number;
}

function calculateSectionWordBudgets(
  sectionGroups: Map<ScriptSectionType, ImageInput[]>,
  maxTotalWords: number
): SectionWordBudget[] {
  // First pass: calculate raw budgets
  const rawBudgets = SECTION_CONFIG.map((config) => {
    const imagesInSection = sectionGroups.get(config.type) || [];
    const imageCount = imagesInSection.length;

    // Closing section has no images but needs ~6 seconds for CTA
    const clipSeconds = config.type === "closing"
      ? 6
      : Math.max(imageCount * KLING_CLIP_DURATION, 0);

    // Calculate target words: seconds × (words per minute / 60)
    const exactWords = clipSeconds * (TTS_WORDS_PER_MINUTE / 60);
    // Round to nearest 5, with minimum of 10 for non-empty sections
    const targetWords = Math.max(
      Math.round(exactWords / 5) * 5,
      imageCount > 0 || config.type === "closing" ? 15 : 0
    );

    return {
      type: config.type,
      title: config.title,
      imageCount,
      clipSeconds,
      targetWords,
    };
  });

  // Second pass: enforce hard cap by scaling down if needed
  const totalRawWords = rawBudgets.reduce((sum, b) => sum + b.targetWords, 0);
  if (totalRawWords > maxTotalWords) {
    const scaleFactor = maxTotalWords / totalRawWords;
    return rawBudgets.map((budget) => ({
      ...budget,
      targetWords: Math.max(Math.round(budget.targetWords * scaleFactor / 5) * 5, 10),
    }));
  }

  return rawBudgets;
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

    // Calculate video duration and dynamic word budget
    // Formula: (videoDuration - END_CARD_SECONDS) × (WPM / 60)
    const videoDuration = sortedImages.length * KLING_CLIP_DURATION;
    const availableNarrationTime = videoDuration - END_CARD_SECONDS;
    const calculatedMaxWords = Math.floor(availableNarrationTime * (TTS_WORDS_PER_MINUTE / 60));
    // Cap at DEFAULT_MAX_TOTAL_WORDS to prevent excessively long scripts
    const maxTotalWords = Math.min(DEFAULT_MAX_TOTAL_WORDS, Math.max(calculatedMaxWords, 60));

    console.log(`Script generation: ${sortedImages.length} images × ${KLING_CLIP_DURATION}s = ${videoDuration}s video`);
    console.log(`Narration time: ${availableNarrationTime}s (${END_CARD_SECONDS}s reserved for end card)`);
    console.log(`Max words: ${maxTotalWords} (calculated: ${calculatedMaxWords}, cap: ${DEFAULT_MAX_TOTAL_WORDS})`);

    // Calculate word budgets based on image counts per section
    const wordBudgets = calculateSectionWordBudgets(sectionGroups, maxTotalWords);

    // Build the GPT-4 prompt with order-aware, timing-constrained approach
    const prompt = buildScriptPrompt(propertyData, sortedImages, wordBudgets, maxTotalWords, videoDuration);

    // Call GPT-4 for narration
    // Lower temperature (0.4) for more consistent word counts
    // Lower max_tokens (800) since scripts are now constrained to ~150 words
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a luxury real estate video narrator creating compelling, descriptive scripts.

CRITICAL TIMING CONSTRAINT:
- This is a ${videoDuration}-second video with ${END_CARD_SECONDS}s reserved for the end card
- Total narration MUST be under ${maxTotalWords} words (approximately ${Math.floor(maxTotalWords / 2)} words per minute at 120 WPM)
- Going over the word limit will cause narration to be cut off!

SECTION REQUIREMENTS:
- EVERY section MUST have at least 40 characters
- Each sentence should be 5-10 words maximum
- Opening: Set the scene with location (15-25 words)
- Closing: Call-to-action with address (15-20 words)

STYLE:
- Evocative but concise descriptions
- Short, punchy sentences
- No filler phrases ("boasting", "featuring", "you'll love")
- Focus on what makes this property unique

OUTPUT: JSON only with sections array`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 800,
      temperature: 0.4,
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

    // Validate word count - warn if over budget
    const totalGeneratedWords = generated.sections.reduce(
      (sum, s) => sum + (s.content?.split(/\s+/).filter(w => w.length > 0).length || 0),
      0
    );
    const estimatedDuration = Math.round(totalGeneratedWords / (TTS_WORDS_PER_MINUTE / 60));

    console.log(`Script generated: ${totalGeneratedWords} words (limit: ${maxTotalWords})`);
    console.log(`Estimated narration duration: ${estimatedDuration}s (available: ${videoDuration - END_CARD_SECONDS}s)`);

    if (totalGeneratedWords > maxTotalWords * 1.1) {
      console.warn(`⚠️ Script over budget by ${Math.round((totalGeneratedWords / maxTotalWords - 1) * 100)}%`);
      console.warn(`This may cause narration to be cut off at the end of the video`);
    }

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
 * Uses user's image order, detects transitions, and constrains word counts
 * to match available video footage duration.
 */
function buildScriptPrompt(
  property: PropertyInput,
  sortedImages: ImageInput[],
  wordBudgets: SectionWordBudget[],
  maxTotalWords: number,
  videoDuration: number
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

  // Build dynamic script structure based on word budgets
  const scriptStructure = wordBudgets
    .map((budget) => {
      if (budget.imageCount === 0 && budget.type !== "closing") {
        return `- ${budget.title} (10-15 words): Brief transition only (no images in this section)`;
      }
      const description = budget.type === "closing"
        ? "Final CTA with property address"
        : `${budget.imageCount} image${budget.imageCount !== 1 ? "s" : ""} = ${budget.clipSeconds}s of footage`;
      return `- ${budget.title} (~${budget.targetWords} words): ${description}`;
    })
    .join("\n");

  // Calculate total expected duration
  const totalWords = wordBudgets.reduce((sum, b) => sum + b.targetWords, 0);
  const totalSeconds = wordBudgets.reduce((sum, b) => sum + b.clipSeconds, 0);

  // Use the passed-in maxTotalWords (already capped)
  const cappedTotalWords = Math.min(totalWords, maxTotalWords);

  return `Create an engaging narration for a ${videoDuration}-second luxury property video. STRICT LIMIT: ${cappedTotalWords} words maximum.

**PROPERTY:**
${property.address}, ${property.city}, ${property.state}
${formatPrice(property.price)} | ${property.beds} bed, ${property.baths} bath | ${property.sqft.toLocaleString()} sq ft
${property.description ? `Description: ${property.description}` : ""}
${neighborhoodPOIs}${agentContact}

**IMAGE SEQUENCE:** (${sortedImages.length} images, shown in this order)
${imageSequence}

**SECTION WORD TARGETS:**
${scriptStructure}

**NARRATIVE FLOW:**
- Opening: Set the scene, establish location and first impression
- Outdoor: Capture the lifestyle - entertaining, relaxation, views
- Living: Guide through the heart of the home - flow, light, details
- Private: Create intimacy - retreat, comfort, personal sanctuary
- Closing: Strong call to action with property address

**TRANSITIONS:**
${transitionGuidelines}

**MINIMUM LENGTH REQUIREMENT:**
⚠️ EVERY section MUST be at least 50 characters. Sections under 50 characters will fail validation.

**OUTPUT FORMAT (JSON only):**
{
  "sections": [
    {"type": "opening", "content": "At least 50 chars - set the scene with location..."},
    {"type": "outdoor", "content": "At least 50 chars - describe outdoor lifestyle..."},
    {"type": "living", "content": "At least 50 chars - guide through living spaces..."},
    {"type": "private", "content": "At least 50 chars - create intimacy in private areas..."},
    {"type": "closing", "content": "At least 50 chars - call to action with full address..."}
  ]
}

For sections with no images, still write at least 50 characters as a smooth transition.`;
}
