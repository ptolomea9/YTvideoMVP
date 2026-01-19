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
 * Flow: Exterior → Outdoor → Living spaces → Private spaces → Amenities → Closing
 * This creates a natural tour progression:
 * - Approach the house (curb appeal)
 * - Show the grounds/outdoor spaces
 * - Enter and explore living spaces
 * - Retreat to private bedrooms/bathrooms
 * - Showcase premium amenities (gym, media room, wine cellar, etc.)
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
  { type: "amenities", title: "Premium Amenities", roomTypes: ["home_office", "gym", "media_room", "walk_in_closet", "laundry", "wine_cellar", "game_room"] },
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
  premium_amenities: ["home_office", "gym", "media_room", "walk_in_closet", "laundry", "wine_cellar", "game_room"],
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
    premium_amenities: "The property's exclusive features include...",
  },
  outdoor_amenities: {
    exterior_approach: "Returning to the front...",
    interior_main: "Now let's head inside...",
    interior_private: "Inside, the private quarters await...",
    premium_amenities: "This home also offers premium amenities...",
  },
  interior_main: {
    exterior_approach: "Back outside...",
    outdoor_amenities: "The outdoor living continues...",
    interior_private: "The private retreat begins...",
    premium_amenities: "For entertainment and relaxation...",
  },
  interior_private: {
    exterior_approach: "Stepping back outside...",
    outdoor_amenities: "The outdoor amenities...",
    interior_main: "Returning to the living spaces...",
    premium_amenities: "Beyond the bedrooms, discover...",
  },
  premium_amenities: {
    exterior_approach: "Returning outside...",
    outdoor_amenities: "The outdoor spaces complement...",
    interior_main: "Back to the heart of the home...",
    interior_private: "The private quarters offer...",
  },
  other: {
    exterior_approach: "Moving on...",
    outdoor_amenities: "Continuing the tour...",
    interior_main: "Exploring further...",
    interior_private: "And finally...",
    premium_amenities: "The amenities include...",
  },
};

/**
 * US state abbreviations to full names.
 * Used to ensure TTS reads state names correctly (e.g., "FL" → "Florida").
 */
const US_STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "Washington D.C.", PR: "Puerto Rico", VI: "Virgin Islands", GU: "Guam",
};

/**
 * Convert state abbreviation to full name for TTS pronunciation.
 * If already a full name or not recognized, returns as-is.
 */
function getStateName(state: string): string {
  const normalized = state.trim().toUpperCase();
  return US_STATE_NAMES[normalized] || state;
}

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
 * Using 160 WPM (conservative estimate) - actual ElevenLabs speed is 180-200 WPM.
 * This leaves room for natural pauses and punctuation-based slowdowns.
 */
const TTS_WORDS_PER_MINUTE = 160;

/**
 * Seconds reserved for end card (agent branding overlay).
 * Narration should finish before this to avoid being cut off.
 */
const END_CARD_SECONDS = 8;

/**
 * Timing constants for audio-video sync.
 * These match the n8n workflow settings for consistent timing.
 */
const INTRO_SILENCE = 2;      // 2s silence before first narration
const SECTION_BUFFER = 0.5;   // 0.5s buffer between sections
const BREATHING_ROOM = 2.5;   // 2.5s allowed overflow for richer narration (fills gaps better)

/**
 * Maximum total words for entire script.
 * Increased to allow richer narration that fills each section's video duration.
 * n8n handles voice speed variance with tiered adjustments.
 */
const MAX_TOTAL_WORDS = 320;

/**
 * Calculate word budget for each section based on image count and timing constraints.
 * This ensures narration duration matches available video footage with proper sync.
 *
 * Timing model:
 * - Opening: loses INTRO_SILENCE (2s) to silence before narration starts
 * - Other sections: lose SECTION_BUFFER (0.5s) for transitions
 * - All sections: gain BREATHING_ROOM (1.5s) for richer narration with controlled overflow
 *
 * Formula: availableSeconds × (160 WPM / 60) = words
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
  // First pass: calculate raw budgets with timing constraints
  const rawBudgets = SECTION_CONFIG.map((config) => {
    const imagesInSection = sectionGroups.get(config.type) || [];
    const imageCount = imagesInSection.length;

    // Closing section has no images but needs ~6 seconds for CTA
    const clipSeconds = config.type === "closing"
      ? 6
      : Math.max(imageCount * KLING_CLIP_DURATION, 0);

    // Calculate AVAILABLE time accounting for timing constraints + breathing room
    let availableSeconds: number;
    if (config.type === "opening") {
      // Opening loses 2s to intro silence, but gains breathing room
      availableSeconds = Math.max(clipSeconds - INTRO_SILENCE + BREATHING_ROOM, 0);
    } else {
      // Other sections lose 0.5s buffer, but gain breathing room
      availableSeconds = Math.max(clipSeconds - SECTION_BUFFER + BREATHING_ROOM, 0);
    }

    // Calculate target words: availableSeconds × (words per minute / 60)
    const exactWords = availableSeconds * (TTS_WORDS_PER_MINUTE / 60);
    // Round to nearest 5, with minimum of 10 for non-empty sections
    const targetWords = Math.max(
      Math.round(exactWords / 5) * 5,
      imageCount > 0 || config.type === "closing" ? 10 : 0
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

    // Calculate video duration - n8n handles voice speed variance with tiered adjustments
    const videoDuration = sortedImages.length * KLING_CLIP_DURATION;
    const maxTotalWords = MAX_TOTAL_WORDS;

    console.log(`Script generation: ${sortedImages.length} images × ${KLING_CLIP_DURATION}s = ${videoDuration}s video`);
    console.log(`Max words: ${maxTotalWords} (n8n handles voice speed variance)`);

    // Calculate word budgets based on image counts per section
    const wordBudgets = calculateSectionWordBudgets(sectionGroups, maxTotalWords);

    // Build the GPT-4 prompt with order-aware, timing-constrained approach
    const prompt = buildScriptPrompt(propertyData, sortedImages, wordBudgets, maxTotalWords, videoDuration);

    // Call GPT-4 for narration
    // Lower temperature (0.4) for consistent word counts
    // n8n handles voice speed variance with tiered adjustments, so allow richer scripts
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a luxury real estate video narrator creating compelling, NARRATIVE scripts that tell a STORY.

CRITICAL TIMING CONSTRAINT:
- This is a ${videoDuration}-second video with ${END_CARD_SECONDS}s reserved for the end card
- Voice reads at ~160 words per minute
- Each section has a word BUDGET - use it fully to fill the video time with rich narration!
- Target ~${maxTotalWords} words total - FILL the available time

SECTION REQUIREMENTS:
- EVERY section MUST have at least 50 characters
- Use your FULL word budget for each section - short sections create awkward silence
- Vary sentence length: mix 5-8 word punches with 12-18 word flowing descriptions

NARRATIVE STYLE (CRITICAL):
- Write like a high-end property tour HOST guiding someone through the home
- NEVER list items ("This room has a ceiling fan, a desk, and hardwood floors")
- Instead, CREATE ATMOSPHERE: "Natural light pours through expansive windows, illuminating warm hardwood floors that lead you deeper into this inviting space"
- Describe the EXPERIENCE and FEELING, not an inventory
- Use sensory language: light, warmth, texture, space, flow
- Connect spaces with movement: "As we move through..." "Continuing into..." "Beyond these doors..."
- For INTERIORS: Paint a picture of how it FEELS to be in the space

IMAGE-BY-IMAGE COVERAGE (CRITICAL):
- Count the images in each section and ensure your narration touches on EACH ONE
- Use the distinctive features from image labels: "dual vanity" → mention dual sinks, "jetted tub" → mention spa-like soaking
- Two images of same room type = two DISTINCT spaces to describe (not one!)
- For PRIVATE section: MUST describe EVERY bedroom AND EVERY bathroom image
- NEVER skip an image - each represents 5 seconds of video that needs narration

FORBIDDEN PATTERNS:
- "This room features..." / "This space has..." / "You'll find..."
- Lists of furniture or fixtures
- Generic descriptions like "beautiful" without specifics
- Describing obvious things in photos ("there is a bed in the bedroom")
- Skipping bathrooms or treating them as less important than bedrooms

OUTPUT: JSON only with sections array`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 1500,
      temperature: 0.5,  // Slightly higher for more creative narrative
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

  // Build dynamic script structure based on word budgets - emphasize FILLING the budget
  const scriptStructure = wordBudgets
    .map((budget) => {
      if (budget.imageCount === 0 && budget.type !== "closing") {
        return `- ${budget.title}: ~15 words (no images - smooth transition)`;
      }
      const description = budget.type === "closing"
        ? "Final CTA with property address"
        : `${budget.imageCount} image${budget.imageCount !== 1 ? "s" : ""} = ${budget.clipSeconds}s of footage - FILL THIS TIME`;
      // Calculate a target range: min 80% of budget, max 100%
      const minWords = Math.round(budget.targetWords * 0.85);
      return `- ${budget.title}: ${minWords}-${budget.targetWords} words (${description})`;
    })
    .join("\n");

  // Calculate total expected duration
  const totalWords = wordBudgets.reduce((sum, b) => sum + b.targetWords, 0);
  const totalSeconds = wordBudgets.reduce((sum, b) => sum + b.clipSeconds, 0);

  // Use the passed-in maxTotalWords (already capped)
  const cappedTotalWords = Math.min(totalWords, maxTotalWords);

  return `Create an immersive, NARRATIVE tour for a ${videoDuration}-second luxury property video. Target: ${cappedTotalWords} words total.

**PROPERTY:**
${property.address}, ${property.city}, ${getStateName(property.state)}
${formatPrice(property.price)} | ${property.beds} bed, ${property.baths} bath | ${property.sqft.toLocaleString()} sq ft
${property.description ? `Description: ${property.description}` : ""}
${neighborhoodPOIs}${agentContact}

**IMAGE SEQUENCE:** (${sortedImages.length} images, shown in this order)
${imageSequence}

**⚠️ IMAGE COVERAGE REQUIREMENT:**
- You MUST reference EVERY image in the sequence above
- Use distinctive features from each image label (e.g., "dual vanity", "jetted tub", "warm tones")
- If there are 4 images in a section, the narration must cover all 4 spaces
- NEVER skip an image - each one represents 5 seconds of video that needs narration
- Two images of the same room type (e.g., 2 bathrooms) = two DISTINCT spaces to describe

**⚠️ WORD BUDGETS - FILL EACH SECTION:**
${scriptStructure}

IMPORTANT: Short sections create AWKWARD SILENCE in the video. Fill each section's word budget!
Voice reads at 160 WPM - these budgets are calculated to match each section's video duration.

**NARRATIVE APPROACH (CRITICAL):**
- Opening: WELCOME viewers, paint the setting - time of day, light quality, neighborhood feel
- Outdoor: CREATE the lifestyle EXPERIENCE - imagine hosting, relaxing, entertaining here
- Living: GUIDE viewers through with movement - "As you step in..." "The eye is drawn to..."
- Private: MUST describe EVERY IMAGE shown - if there are 2 bathrooms, describe BOTH using their unique features from the labels (dual vanity, jetted tub, marble counters, etc.). Each bedroom AND each bathroom needs narration!
- Amenities: INSPIRE with possibilities - how these spaces enhance daily life
- Closing: COMPEL action with emotional recap and clear contact info

**STYLE RULES:**
- Write in SECOND PERSON when appropriate ("As you enter..." "Imagine waking here...")
- Use SENSORY details: light, warmth, texture, scent, sound
- Create FLOW between rooms: "Beyond the living area..." "Just steps away..."
- For BATHROOMS/BEDROOMS: Focus on sanctuary, retreat, renewal - NOT fixtures

**TRANSITIONS:**
${transitionGuidelines}

**⚠️ LENGTH REQUIREMENT:**
- EVERY section MUST be at least 50 characters
- FILL your word budget - don't leave sections short!

**OUTPUT FORMAT (JSON only):**
{
  "sections": [
    {"type": "opening", "content": "Evocative scene-setting with location..."},
    {"type": "outdoor", "content": "Lifestyle narrative of outdoor spaces..."},
    {"type": "living", "content": "Guided tour through living areas..."},
    {"type": "private", "content": "Sanctuary feel of private spaces..."},
    {"type": "amenities", "content": "Inspiring possibilities of amenities..."},
    {"type": "closing", "content": "Emotional recap with call to action..."}
  ]
}

For sections with no images, write a smooth 15-word transition to the next space.`;
}
