/**
 * n8n Integration Module
 *
 * Utilities for integrating with n8n video generation workflows.
 */

// Transform wizard data to n8n payload format
export {
  transformWizardToN8n,
  validateN8nPayload,
  type N8nTourVideoPayload,
  type N8nListingVideoPayload,
} from "./transform";

// Default music library
export {
  MUSIC_TRACKS,
  getDefaultMusicTrack,
  getDefaultMusicUrl,
  getMusicTrackById,
  getMusicTracksByMood,
  type MusicTrack,
} from "./music";

// n8n webhook client
export {
  N8N_WORKFLOWS,
  buildWebhookUrl,
  triggerTourVideo,
  checkN8nHealth,
  type WorkflowType,
  type N8nWebhookResponse,
} from "./client";
