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
 * Image data after upload (Step 2 - UPLOAD).
 * Uses URL strings instead of File objects to keep state serializable.
 */
export interface WizardImage {
  id: string;
  url: string;
  filename: string;
  order: number;
  label: string;          // AI-suggested label (editable by user)
  roomType: RoomType;     // Broad category for video sequencing
  features: string[];     // Notable features for script generation
}

/**
 * Script section for narration (Step 3 - SCRIPT).
 */
export interface ScriptSection {
  id: string;
  imageId: string;
  content: string;
  duration: number; // seconds
  order: number;
}

/**
 * Style options for video generation (Step 4 - STYLE).
 */
export interface StyleOptions {
  voiceId: string;
  voiceName: string;
  musicTrack: string;
  transitionStyle: "fade" | "slide" | "zoom" | "none";
  colorGrading: "warm" | "cool" | "neutral" | "cinematic";
  textOverlay: boolean;
  watermark: boolean;
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
  | { type: "UPDATE_SCRIPT"; payload: ScriptSection[] }
  | { type: "UPDATE_SCRIPT_SECTION"; payload: ScriptSection }
  | { type: "SET_STYLE_OPTIONS"; payload: Partial<StyleOptions> }
  | { type: "SET_SUBMITTING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "RESET" };

/**
 * Initial state for the wizard.
 */
export const initialWizardState: WizardState = {
  currentStep: WizardStep.DATA,
  completedSteps: [],
  propertyData: {},
  images: [],
  scriptSections: [],
  styleOptions: {
    transitionStyle: "fade",
    colorGrading: "cinematic",
    textOverlay: true,
    watermark: false,
  },
  isSubmitting: false,
  error: null,
};
