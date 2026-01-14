/**
 * Wizard Types - Type definitions for the multi-step video creation wizard.
 */

/**
 * WizardStep enum representing the four steps of the wizard.
 */
export enum WizardStep {
  DATA = 0,
  UPLOAD = 1,
  SCRIPT = 2,
  STYLE = 3,
}

/**
 * Step labels for display in the UI.
 */
export const WIZARD_STEP_LABELS: Record<WizardStep, string> = {
  [WizardStep.DATA]: "Data",
  [WizardStep.UPLOAD]: "Upload",
  [WizardStep.SCRIPT]: "Script",
  [WizardStep.STYLE]: "Style",
};

/**
 * Property data collected in Step 1 (DATA).
 */
export interface PropertyData {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  lotSize?: number;
  lotSizeUnit?: "sqft" | "acres";
  listingPrice: number;
  description: string;
  features: string[];
  // Agent contact info for video closing
  agentPhone?: string;
  agentSocial?: string;
}

/**
 * Room type for video sequencing.
 */
export type RoomType =
  | "exterior"
  | "entry"
  | "living"
  | "kitchen"
  | "dining"
  | "master_bedroom"
  | "bedroom"
  | "bathroom"
  | "outdoor"
  | "other";

/**
 * Enhancement preset options for image processing.
 * Applied via Kie.ai in n8n pipeline.
 */
export type EnhancementPreset =
  | "original"      // No enhancement
  | "golden_hour"   // Warm sunset lighting on entire image
  | "sunset_sky"    // Replace sky only with golden sunset (exteriors)
  | "hdr"           // High dynamic range, detail enhancement
  | "vivid";        // Saturated colors, contrast boost

/**
 * Enhancement status for tracking API calls.
 */
export type EnhancementStatus =
  | "idle"          // No enhancement selected or reverted
  | "previewing"    // CSS preview active, not yet applied
  | "applying"      // Kie.ai API call in progress
  | "applied"       // Enhancement applied successfully
  | "error";        // Enhancement failed

/**
 * Cache of enhanced URLs per preset.
 * Allows switching between presets without regenerating.
 */
export type EnhancedUrlCache = Partial<Record<Exclude<EnhancementPreset, "original">, string>>;

/**
 * Image data after upload (Step 2 - UPLOAD).
 * Uses URL strings instead of File objects to keep state serializable.
 */
export interface WizardImage {
  id: string;
  url: string;                      // Original image URL
  filename: string;
  order: number;
  label: string;                    // AI-suggested label (editable by user)
  roomType: RoomType;               // Broad category for video sequencing
  features: string[];               // Notable features for script generation
  enhancement: EnhancementPreset;   // Image enhancement preset (default: 'original')
  enhancementStatus: EnhancementStatus;  // Status of enhancement (default: 'idle')
  enhancedUrls: EnhancedUrlCache;   // Cache of enhanced URLs per preset (persists across reverts)
}

/**
 * Script section types for the 5 tour sections.
 */
export type ScriptSectionType =
  | "opening"    // Exterior/curb appeal
  | "living"     // Entry, living, kitchen, dining
  | "private"    // Bedrooms, bathrooms
  | "outdoor"    // Backyard, amenities, POIs
  | "closing";   // CTA wrap-up

/**
 * Script section for narration (Step 3 - SCRIPT).
 * Section-based approach: 5 cohesive sections instead of per-image scripts.
 */
export interface ScriptSection {
  id: string;
  type: ScriptSectionType;
  title: string;           // Display title (e.g., "Opening")
  content: string;         // Narration text
  originalContent: string; // For detecting edits
  imageIds: string[];      // Images referenced in this section
  order: number;
}

/**
 * Voice source types for tracking where the voice came from.
 */
export type VoiceSource = "my_voices" | "recorded" | "uploaded" | "library";

/**
 * Music selection for background music.
 */
export interface MusicSelection {
  type: "library" | "upload" | "none";
  trackId?: string;
  trackUrl?: string;
  trackName?: string;
}

/**
 * Style options for video generation (Step 4 - STYLE).
 */
export interface StyleOptions {
  voiceId: string;
  voiceName: string;
  voiceSource: VoiceSource;
  musicEnabled: boolean;
  musicSelection: MusicSelection;
  mlsDualOutput: boolean;
}

/**
 * Complete wizard state.
 */
export interface WizardState {
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  propertyData: Partial<PropertyData>;
  images: WizardImage[];
  scriptSections: ScriptSection[];
  styleOptions: Partial<StyleOptions>;
  isSubmitting: boolean;
  error: string | null;
}

/**
 * Wizard action types for the reducer.
 */
export type WizardAction =
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "GO_TO_STEP"; payload: WizardStep }
  | { type: "SET_PROPERTY_DATA"; payload: Partial<PropertyData> }
  | { type: "ADD_IMAGES"; payload: WizardImage[] }
  | { type: "REMOVE_IMAGE"; payload: string }
  | { type: "REORDER_IMAGES"; payload: WizardImage[] }
  | { type: "UPDATE_IMAGE_ENHANCEMENT"; payload: { imageId: string; preset: EnhancementPreset } }
  | { type: "SET_ENHANCEMENT_STATUS"; payload: { imageId: string; status: EnhancementStatus } }
  | { type: "SET_ENHANCED_URL"; payload: { imageId: string; preset: Exclude<EnhancementPreset, "original">; enhancedUrl: string } }
  | { type: "REVERT_ENHANCEMENT"; payload: { imageId: string } }
  | { type: "UPDATE_SCRIPT"; payload: ScriptSection[] }
  | { type: "UPDATE_SCRIPT_SECTION"; payload: ScriptSection }
  | { type: "SET_STYLE_OPTIONS"; payload: Partial<StyleOptions> }
  | { type: "SET_SUBMITTING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "RESET" };

/**
 * Initial state for the wizard.
 */
/**
 * Validation constants for video generation requirements.
 */
export const WIZARD_VALIDATION = {
  /** Minimum images required (one per script section) */
  MIN_IMAGES: 5,
  /** Maximum images allowed */
  MAX_IMAGES: 20,
  /** Minimum characters per script section to avoid awkward TTS timing */
  MIN_SECTION_CHARS: 50,
  /** Target words per section for optimal narration */
  TARGET_SECTION_WORDS: 50,
} as const;

export const initialWizardState: WizardState = {
  currentStep: WizardStep.DATA,
  completedSteps: [],
  propertyData: {},
  images: [],
  scriptSections: [],
  styleOptions: {
    musicEnabled: true,
    musicSelection: { type: "none" },
    mlsDualOutput: true,
  },
  isSubmitting: false,
  error: null,
};
