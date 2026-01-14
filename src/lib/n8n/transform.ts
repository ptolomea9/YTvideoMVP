/**
 * n8n Payload Transform Utility
 *
 * Transforms wizard state data into the format expected by n8n workflows.
 * Maps field names and structures to match webhook payload requirements.
 */

import type { PropertyData, WizardImage, ScriptSection, StyleOptions } from "@/lib/wizard/types";
import { getDefaultMusicUrl } from "./music";

/**
 * Payload format expected by the Tour Video n8n workflow.
 */
export interface N8nTourVideoPayload {
  images: Array<{ imageurl: string }>;
  email: string;
  title: string;
  social_handles: string;
  music: string;
  voiceId: string;
  price: string;
  city: string;
  address: string;
  mainSellingPoints: string[];
  size: string;
  bedRoomCount: string;
  bathRoomCount: string;
  lotSize: string;
  propertyType: string;
  preferredTone: string;
  useMusic: "yes" | "no";
  webhookResponse?: string[]; // Script sections for TTS
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
 * Transform wizard state into n8n Tour Video webhook payload.
 *
 * @param propertyData - Property information from Step 1
 * @param images - Uploaded and sorted images from Step 2
 * @param scriptSections - Script sections from Step 3
 * @param styleOptions - Voice and music settings from Step 4
 * @param userEmail - User's email from auth context
 * @returns Formatted payload for n8n webhook
 */
export function transformWizardToN8n(
  propertyData: Partial<PropertyData>,
  images: WizardImage[],
  scriptSections: ScriptSection[],
  styleOptions: Partial<StyleOptions>,
  userEmail: string
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

  // Determine music URL
  // Even if music is disabled, we need a URL - the workflow handles muting
  const musicUrl = getDefaultMusicUrl();

  return {
    images: imagePayload,
    email: userEmail,
    title: generateVideoTitle(propertyData),
    social_handles: propertyData.agentSocial || "",
    music: musicUrl,
    voiceId: styleOptions.voiceId || "",
    price: propertyData.listingPrice?.toString() || "",
    city: propertyData.city || "",
    address: propertyData.address || "",
    mainSellingPoints: propertyData.features || [],
    size: propertyData.squareFeet?.toString() || "",
    bedRoomCount: propertyData.bedrooms?.toString() || "",
    bathRoomCount: propertyData.bathrooms?.toString() || "",
    lotSize: formatLotSize(propertyData),
    propertyType: propertyData.propertyType || "",
    preferredTone: "engaging", // Default tone, could be made configurable
    useMusic: styleOptions.musicEnabled ? "yes" : "no",
    webhookResponse,
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
