/**
 * ElevenLabs API Types
 * Type definitions for ElevenLabs voice API responses.
 */

/**
 * Voice from user's account (cloned, premade, etc.)
 * Returned by GET /v2/voices
 */
export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: "premade" | "cloned" | "generated" | "professional";
  labels?: {
    accent?: string;
    age?: string;
    gender?: string;
    use_case?: string;
    description?: string;
  };
  preview_url?: string;
  description?: string;
  created_at_unix?: number;
}

/**
 * Voice from the shared library
 * Returned by GET /v1/shared-voices
 */
export interface SharedVoice {
  voice_id: string;
  name: string;
  gender?: string;
  age?: string;
  accent?: string;
  language?: string;
  use_case?: string;
  descriptive?: string;
  preview_url?: string;
  category?: "professional" | "famous" | "high_quality";
}

/**
 * Filters for the voice library search
 */
export interface VoiceLibraryFilters {
  gender?: string;
  age?: string;
  accent?: string;
  language?: string;
  use_cases?: string[];
  search?: string;
  page?: number;
  page_size?: number;
}

/**
 * Response from GET /v2/voices
 */
export interface GetVoicesResponse {
  voices: ElevenLabsVoice[];
  has_more: boolean;
  next_page_token?: string;
  total_count?: number;
}

/**
 * Response from GET /v1/shared-voices
 */
export interface GetSharedVoicesResponse {
  voices: SharedVoice[];
  has_more: boolean;
  last_sort_id?: string;
}

/**
 * Response from POST /v1/voices/add (create voice clone)
 */
export interface CreateVoiceResponse {
  voice_id: string;
  requires_verification?: boolean;
}

/**
 * Voice source types for UI
 */
export type VoiceSource = "my_voices" | "recorded" | "uploaded" | "library";

/**
 * Normalized voice data for UI consumption
 */
export interface NormalizedVoice {
  id: string;
  name: string;
  source: VoiceSource;
  gender?: string;
  accent?: string;
  description?: string;
  previewUrl?: string;
}
