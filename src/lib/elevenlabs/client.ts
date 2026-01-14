/**
 * ElevenLabs API Client
 * Server-side utilities for interacting with ElevenLabs API.
 */

import {
  ElevenLabsVoice,
  SharedVoice,
  VoiceLibraryFilters,
  GetVoicesResponse,
  GetSharedVoicesResponse,
  CreateVoiceResponse,
} from "./types";

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io";

/**
 * Fetch user's voices from ElevenLabs
 * @param apiKey - ElevenLabs API key
 * @param category - Optional filter: 'premade' | 'cloned' | 'generated' | 'professional'
 */
export async function fetchUserVoices(
  apiKey: string,
  category?: string
): Promise<GetVoicesResponse> {
  const url = new URL(`${ELEVENLABS_API_BASE}/v2/voices`);

  if (category) {
    url.searchParams.set("category", category);
  }
  url.searchParams.set("page_size", "100");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "xi-api-key": apiKey,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Fetch shared voices from ElevenLabs voice library
 * @param apiKey - ElevenLabs API key
 * @param filters - Search and filter parameters
 */
export async function fetchSharedVoices(
  apiKey: string,
  filters: VoiceLibraryFilters = {}
): Promise<GetSharedVoicesResponse> {
  const url = new URL(`${ELEVENLABS_API_BASE}/v1/shared-voices`);

  if (filters.gender) url.searchParams.set("gender", filters.gender);
  if (filters.age) url.searchParams.set("age", filters.age);
  if (filters.accent) url.searchParams.set("accent", filters.accent);
  if (filters.language) url.searchParams.set("language", filters.language);
  if (filters.search) url.searchParams.set("search", filters.search);
  if (filters.page !== undefined) url.searchParams.set("page", String(filters.page));
  if (filters.page_size) url.searchParams.set("page_size", String(filters.page_size));
  if (filters.use_cases && filters.use_cases.length > 0) {
    filters.use_cases.forEach(uc => url.searchParams.append("use_cases", uc));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "xi-api-key": apiKey,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Create an instant voice clone
 * @param apiKey - ElevenLabs API key
 * @param name - Name for the new voice
 * @param audioBlob - Audio file blob for cloning
 * @param removeBackgroundNoise - Whether to remove background noise (default: false)
 */
export async function createVoiceClone(
  apiKey: string,
  name: string,
  audioBlob: Blob,
  removeBackgroundNoise: boolean = false
): Promise<CreateVoiceResponse> {
  const formData = new FormData();
  formData.append("name", name);
  formData.append("files", audioBlob, "recording.mp3");
  formData.append("remove_background_noise", String(removeBackgroundNoise));

  const response = await fetch(`${ELEVENLABS_API_BASE}/v1/voices/add`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Get a single voice by ID
 * @param apiKey - ElevenLabs API key
 * @param voiceId - Voice ID to fetch
 */
export async function getVoice(
  apiKey: string,
  voiceId: string
): Promise<ElevenLabsVoice> {
  const response = await fetch(`${ELEVENLABS_API_BASE}/v1/voices/${voiceId}`, {
    method: "GET",
    headers: {
      "xi-api-key": apiKey,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Normalize voice data from different sources into a common format
 */
export function normalizeUserVoice(voice: ElevenLabsVoice): {
  id: string;
  name: string;
  gender?: string;
  accent?: string;
  description?: string;
  previewUrl?: string;
  category: string;
} {
  return {
    id: voice.voice_id,
    name: voice.name,
    gender: voice.labels?.gender,
    accent: voice.labels?.accent,
    description: voice.description || voice.labels?.description,
    previewUrl: voice.preview_url,
    category: voice.category,
  };
}

export function normalizeSharedVoice(voice: SharedVoice): {
  id: string;
  name: string;
  gender?: string;
  accent?: string;
  description?: string;
  previewUrl?: string;
  useCase?: string;
} {
  return {
    id: voice.voice_id,
    name: voice.name,
    gender: voice.gender,
    accent: voice.accent,
    description: voice.descriptive,
    previewUrl: voice.preview_url,
    useCase: voice.use_case,
  };
}
