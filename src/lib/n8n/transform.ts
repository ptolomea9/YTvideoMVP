/**
 * n8n Payload Transform Utility
 *
 * Transforms wizard state data into the format expected by n8n workflows.
 * Maps field names and structures to match webhook payload requirements.
 */

import type { PropertyData, WizardImage, ScriptSection, StyleOptions, ScriptSectionType, RoomType } from "@/lib/wizard/types";
import { getDefaultMusicUrl } from "./music";

/**
 * Maps script section types to their preferred room types.
 * Order matters - first match is preferred.
 */
const SECTION_TO_ROOM_MAPPING: Record<ScriptSectionType, RoomType[]> = {
  opening: ["exterior"],
  living: ["entry", "living", "kitchen", "dining"],
  private: ["master_bedroom", "guest_bedroom", "bedroom", "bathroom", "home_office"],
  outdoor: ["outdoor"],
  closing: ["exterior", "outdoor"], // CTA often shows hero exterior or lifestyle shot
};

/**
 * Maps images to script sections based on room type.
 * Uses fallback logic when a section has no matching images.
 *
 * Algorithm:
 * 1. OPENING always gets first 2 images (or 1 if only 1 exists) - regardless of room type
 * 2. For remaining sections, find images with matching room types
 * 3. If no matches, try fallback to "other" room type
 * 4. If still no matches, reuse the best available image (exterior preferred)
 *
 * @param images - All wizard images sorted by order
 * @param sections - Script sections
 * @returns Map of section ID to array of image IDs
 */
export function mapImagesToSections(
  images: WizardImage[],
  sections: ScriptSection[]
): Map<string, string[]> {
  const mapping = new Map<string, string[]>();
  const usedImageIds = new Set<string>();

  // Sort images by order for consistent assignment
  const sortedImages = [...images].sort((a, b) => a.order - b.order);

  // OPENING ALWAYS GETS FIRST 2 IMAGES (or 1 if only 1 exists)
  // This ensures opening narration describes the first images the viewer sees
  const openingSection = sections.find(s => s.type === 'opening');
  if (openingSection && sortedImages.length > 0) {
    const openingImageCount = Math.min(2, sortedImages.length);
    const openingImageIds = sortedImages.slice(0, openingImageCount).map(img => img.id);
    mapping.set(openingSection.id, openingImageIds);
    openingImageIds.forEach(id => usedImageIds.add(id));
  }

  // First pass: assign images to sections based on room type (skip opening - already handled)
  for (const section of sections) {
    if (section.type === 'opening') continue; // Already handled above

    const preferredRoomTypes = SECTION_TO_ROOM_MAPPING[section.type];
    const matchingImages = sortedImages.filter(
      (img) => preferredRoomTypes.includes(img.roomType) && !usedImageIds.has(img.id)
    );

    if (matchingImages.length > 0) {
      // Use matching images, mark them as used
      const imageIds = matchingImages.map((img) => img.id);
      mapping.set(section.id, imageIds);
      imageIds.forEach((id) => usedImageIds.add(id));
    } else {
      // No match yet - will handle in fallback pass
      mapping.set(section.id, []);
    }
  }

  // Second pass: handle sections with no images (fallback logic)
  for (const section of sections) {
    const currentImages = mapping.get(section.id) || [];
    if (currentImages.length > 0) continue;

    // Try "other" room type first
    const otherImages = sortedImages.filter(
      (img) => img.roomType === "other" && !usedImageIds.has(img.id)
    );
    if (otherImages.length > 0) {
      mapping.set(section.id, [otherImages[0].id]);
      usedImageIds.add(otherImages[0].id);
      continue;
    }

    // Fallback: reuse best available image (prefer exterior for closing, any for others)
    const fallbackPreference: RoomType[] =
      section.type === "closing"
        ? ["exterior", "outdoor", "living", "entry"]
        : ["exterior", "living", "entry", "outdoor"];

    let fallbackImage: WizardImage | undefined;
    for (const roomType of fallbackPreference) {
      fallbackImage = sortedImages.find((img) => img.roomType === roomType);
      if (fallbackImage) break;
    }

    // Last resort: use first available image
    if (!fallbackImage && sortedImages.length > 0) {
      fallbackImage = sortedImages[0];
    }

    if (fallbackImage) {
      mapping.set(section.id, [fallbackImage.id]);
      // Note: we allow reuse here, so don't add to usedImageIds
    }
  }

  return mapping;
}

/**
 * Get images for a specific section with fallback support.
 * Convenience wrapper around mapImagesToSections.
 */
export function getImagesForSection(
  images: WizardImage[],
  sections: ScriptSection[],
  sectionId: string
): WizardImage[] {
  const mapping = mapImagesToSections(images, sections);
  const imageIds = mapping.get(sectionId) || [];
  return imageIds
    .map((id) => images.find((img) => img.id === id))
    .filter((img): img is WizardImage => img !== undefined);
}

/**
 * Image timing for beat-synced transitions.
 */
export interface ImageTiming {
  imageurl: string;
  start: number; // Start time in seconds
  duration: number; // Duration in seconds
  fadeIn?: number; // Fade-in duration
  fadeOut?: number; // Fade-out duration
}

/**
 * Payload format expected by the Tour Video n8n workflow.
 */
export interface N8nTourVideoPayload {
  videoId?: string; // Video UUID for completion callback
  images: Array<{ imageurl: string }>;
  imageTiming?: ImageTiming[]; // Beat-synced timings (optional, for json2video)
  email: string;
  title: string;
  social_handles: string;
  music: string;
  musicBpm?: number; // Beats per minute of selected track
  musicBeats?: number[]; // All beat timestamps (legacy)
  musicSnareHits?: number[]; // Snare hit timestamps (for image transitions)
  musicBassHits?: number[]; // Bass/kick hit timestamps
  voiceId: string;
  price: string;
  city: string;
  address: string;
  mainSellingPoints: string[];
  size: string;
  bedroomCount: string; // Youtube Video workflow uses camelCase
  bathroomCount: string; // Youtube Video workflow uses camelCase
  lotSize: string;
  propertyType: string;
  preferredTone: string;
  useMusic: "yes" | "no";
  webhookResponse?: string[]; // Script sections for TTS
  // Agent branding for closing card
  agentName: string;
  agentPhone: string;
  agentEmail: string;
  agentCta: string;
  logoUrl: string;
  headshotUrl: string;
  estimatedNarrationDuration?: number; // Estimated TTS duration in seconds (fallback for n8n)
  // Section-to-image mapping for anchored timing (n8n uses this to reorder clips)
  sectionImageMapping?: Array<{
    sectionIndex: number;
    sectionType: string;
    imageIndices: number[];
    wordCount: number;           // Word count for reference
  }>;
}

/**
 * Payload format expected by the Video Listing Main workflow.
 * More complex, includes avatar and dual audio.
 */
export interface N8nListingVideoPayload extends N8nTourVideoPayload {
  avatar?: string;
  avatarType?: "heygen" | "custom";
}

/**
 * Generate a title for the video from property data.
 */
function generateVideoTitle(propertyData: Partial<PropertyData>): string {
  const parts: string[] = [];

  if (propertyData.address) {
    parts.push(propertyData.address);
  }

  if (propertyData.city) {
    parts.push(propertyData.city);
  }

  if (parts.length === 0) {
    return "Property Tour";
  }

  return parts.join(", ");
}

/**
 * Get the final URL for an image, using enhanced URL if available.
 */
function getImageUrl(image: WizardImage): string {
  // If an enhancement is applied and we have the enhanced URL, use it
  if (
    image.enhancement !== "original" &&
    image.enhancementStatus === "applied" &&
    image.enhancedUrls[image.enhancement as keyof typeof image.enhancedUrls]
  ) {
    return image.enhancedUrls[image.enhancement as keyof typeof image.enhancedUrls]!;
  }

  // Otherwise use original URL
  return image.url;
}

/**
 * Format lot size with unit for display.
 */
function formatLotSize(propertyData: Partial<PropertyData>): string {
  if (!propertyData.lotSize) {
    return "";
  }

  const unit = propertyData.lotSizeUnit === "acres" ? "acres" : "sq ft";
  return `${propertyData.lotSize} ${unit}`;
}

/**
 * Select snare hits for image transitions.
 * Snare hits provide the "punch" that makes transitions feel natural.
 * Falls back to generic beats or even distribution if snare data unavailable.
 *
 * @param snareHits - Snare hit timestamps (preferred)
 * @param fallbackBeats - Generic beats as fallback
 * @param numTransitions - Number of transitions needed
 * @param trackDuration - Track duration in seconds
 * @param minInterval - Minimum seconds between transitions
 */
function selectTransitionBeats(
  snareHits: number[],
  fallbackBeats: number[],
  numTransitions: number,
  trackDuration: number,
  minInterval: number = 1.5
): number[] {
  // Prefer snare hits, fall back to generic beats
  const beats = snareHits.length > 0 ? snareHits : fallbackBeats;

  if (beats.length === 0 || numTransitions <= 0) {
    // Fallback to even distribution
    const interval = trackDuration / (numTransitions + 1);
    return Array.from({ length: numTransitions }, (_, i) =>
      Math.round((i + 1) * interval * 100) / 100
    );
  }

  // Filter beats to ensure minimum interval between transitions
  const filtered: number[] = [];
  for (const beat of beats) {
    if (filtered.length === 0 || beat - filtered[filtered.length - 1] >= minInterval) {
      filtered.push(beat);
    }
  }

  if (filtered.length <= numTransitions) {
    return filtered;
  }

  // Select evenly spaced beats from filtered set
  const selected: number[] = [];
  const step = filtered.length / numTransitions;

  for (let i = 0; i < numTransitions; i++) {
    const index = Math.floor(i * step);
    selected.push(filtered[index]);
  }

  return selected;
}

/**
 * Calculate image timings based on snare/beat timestamps.
 * Images transition on snare hits for punchy, music-synced video.
 * Falls back to generic beats if snare data unavailable.
 *
 * @param images - Images to sequence
 * @param snareHits - Snare hit timestamps (preferred for transitions)
 * @param fallbackBeats - Generic beats as fallback
 * @param trackDuration - Track duration in seconds
 * @param fadeMs - Fade transition duration in milliseconds
 */
export function calculateBeatSyncedTimings(
  images: WizardImage[],
  snareHits: number[],
  fallbackBeats: number[],
  trackDuration: number,
  fadeMs: number = 200
): ImageTiming[] {
  const sortedImages = [...images].sort((a, b) => a.order - b.order);
  const numImages = sortedImages.length;

  if (numImages === 0) return [];

  // We need (numImages - 1) transitions
  // Prefer snare hits for that punchy transition feel
  const transitionBeats = selectTransitionBeats(
    snareHits,
    fallbackBeats,
    numImages - 1,
    trackDuration
  );
  const timings: ImageTiming[] = [];
  const fadeSec = fadeMs / 1000;

  let currentStart = 0;

  for (let i = 0; i < numImages; i++) {
    const imageUrl = getImageUrl(sortedImages[i]);

    if (i < transitionBeats.length) {
      // Duration until next beat transition
      const duration = transitionBeats[i] - currentStart;
      timings.push({
        imageurl: imageUrl,
        start: Math.round(currentStart * 100) / 100,
        duration: Math.round(duration * 100) / 100,
        fadeIn: i === 0 ? 0 : fadeSec,
        fadeOut: fadeSec,
      });
      currentStart = transitionBeats[i];
    } else {
      // Last image - duration until end
      const duration = trackDuration - currentStart;
      timings.push({
        imageurl: imageUrl,
        start: Math.round(currentStart * 100) / 100,
        duration: Math.round(duration * 100) / 100,
        fadeIn: fadeSec,
        fadeOut: 0,
      });
    }
  }

  return timings;
}

/**
 * Music track metadata for beat-synced videos.
 */
export interface MusicTrackMeta {
  url: string;
  duration: number; // seconds
  beats?: number[]; // all beat timestamps (legacy)
  bpm?: number;
  snareHits?: number[]; // snare hit timestamps (preferred for transitions)
  bassHits?: number[]; // bass/kick hit timestamps
}

/**
 * Estimate narration duration from script content.
 * Uses average TTS speaking rate of ~150 words per minute.
 *
 * @param scriptSections - Script sections to estimate duration for
 * @returns Estimated duration in seconds
 */
function estimateNarrationDuration(scriptSections: ScriptSection[]): number {
  // Average TTS speaking rate: ~150 words per minute
  const WORDS_PER_MINUTE = 150;

  const totalWords = scriptSections.reduce((sum, section) => {
    const words = section.content.split(/\s+/).filter((w) => w.length > 0);
    return sum + words.length;
  }, 0);

  // Convert to seconds and round up
  return Math.ceil((totalWords / WORDS_PER_MINUTE) * 60);
}

/**
 * Transform wizard state into n8n Tour Video webhook payload.
 *
 * @param propertyData - Property information from Step 1
 * @param images - Uploaded and sorted images from Step 2
 * @param scriptSections - Script sections from Step 3
 * @param styleOptions - Voice and music settings from Step 4
 * @param userEmail - User's email from auth context
 * @param musicTrack - Optional music track metadata for beat-synced transitions
 * @returns Formatted payload for n8n webhook
 */
export function transformWizardToN8n(
  propertyData: Partial<PropertyData>,
  images: WizardImage[],
  scriptSections: ScriptSection[],
  styleOptions: Partial<StyleOptions>,
  userEmail: string,
  musicTrack?: MusicTrackMeta
): N8nTourVideoPayload {
  // Sort images by order and extract URLs
  const sortedImages = [...images].sort((a, b) => a.order - b.order);
  const imagePayload = sortedImages.map((img) => ({
    imageurl: getImageUrl(img),
  }));

  // Extract script content for TTS
  const webhookResponse = scriptSections
    .sort((a, b) => a.order - b.order)
    .map((section) => section.content);

  // Determine music URL and beat data
  const musicUrl = musicTrack?.url || getDefaultMusicUrl();
  const snareHits = musicTrack?.snareHits || [];
  const bassHits = musicTrack?.bassHits || [];
  const beats = musicTrack?.beats || [];
  const bpm = musicTrack?.bpm;
  const trackDuration = musicTrack?.duration || 120; // Default 2 min

  // Calculate beat-synced image timings
  // Prefer snare hits for transitions (punchy feel), fall back to generic beats
  let imageTiming: ImageTiming[] | undefined;
  const hasBeats = snareHits.length > 0 || beats.length > 0;
  if (styleOptions.musicEnabled && hasBeats) {
    imageTiming = calculateBeatSyncedTimings(
      sortedImages as WizardImage[],
      snareHits,
      beats,
      trackDuration
    );
  }

  // Compute section-to-image mapping for anchored timing
  // This tells n8n which images belong to which narration section
  // n8n uses this to reorder video clips so each section's images are contiguous
  const sortedSections = [...scriptSections].sort((a, b) => a.order - b.order);
  const sectionToImageMap = mapImagesToSections(sortedImages, sortedSections);
  const sectionImageMapping = sortedSections.map((section, idx) => {
    const imageIds = sectionToImageMap.get(section.id) || [];
    // Convert image IDs to sorted array indices
    // These indices match the images array sent to n8n (which is also sorted)
    const imageIndices = imageIds
      .map((imgId) => sortedImages.findIndex((i) => i.id === imgId))
      .filter((i) => i >= 0);

    // Calculate per-section word count for reference
    const words = section.content.split(/\s+/).filter((w) => w.length > 0);
    const wordCount = words.length;

    return {
      sectionIndex: idx,
      sectionType: section.type,
      imageIndices,
      wordCount,
    };
  });

  return {
    images: imagePayload,
    imageTiming,
    email: userEmail,
    title: generateVideoTitle(propertyData),
    social_handles: propertyData.agentSocial || "",
    music: musicUrl,
    musicBpm: bpm,
    musicBeats: beats.length > 0 ? beats : undefined,
    musicSnareHits: snareHits.length > 0 ? snareHits : undefined,
    musicBassHits: bassHits.length > 0 ? bassHits : undefined,
    voiceId: styleOptions.voiceId || "",
    price: propertyData.listingPrice?.toString() || "",
    city: propertyData.city || "",
    address: propertyData.address || "",
    mainSellingPoints: propertyData.features || [],
    size: propertyData.squareFeet?.toString() || "",
    bedroomCount: propertyData.bedrooms?.toString() || "",
    bathroomCount: propertyData.bathrooms?.toString() || "",
    lotSize: formatLotSize(propertyData),
    propertyType: propertyData.propertyType || "",
    preferredTone: "engaging", // Default tone, could be made configurable
    useMusic: styleOptions.musicEnabled ? "yes" : "no",
    webhookResponse,
    // Agent branding for closing card
    agentName: propertyData.agentName || "",
    agentPhone: propertyData.agentPhone || "",
    agentEmail: propertyData.agentEmail || "",
    agentCta: propertyData.agentCta || "Contact Me Today",
    logoUrl: propertyData.agentLogoUrl || "",
    headshotUrl: propertyData.agentPhotoUrl || "",
    // Estimated narration duration for n8n timing calculations (fallback)
    estimatedNarrationDuration: estimateNarrationDuration(scriptSections),
    // Section-to-image mapping for anchored timing (which images play during which narration)
    sectionImageMapping,
  };
}

/**
 * Validate that all required fields are present in the payload.
 * Returns an array of missing field names.
 */
export function validateN8nPayload(payload: N8nTourVideoPayload): string[] {
  const missing: string[] = [];

  if (!payload.images || payload.images.length === 0) {
    missing.push("images");
  }

  if (!payload.email) {
    missing.push("email");
  }

  if (!payload.voiceId) {
    missing.push("voiceId");
  }

  if (!payload.city) {
    missing.push("city");
  }

  if (!payload.address) {
    missing.push("address");
  }

  return missing;
}
