/**
 * Audio Analysis Module
 *
 * Utilities for audio analysis including beat detection with bass/snare separation.
 */

export {
  // Legacy exports (backwards compatibility)
  analyzeBeats,
  selectTransitionBeats,
  calculateImageTimings,
  type BeatAnalysis,
  // Drum-separated exports (preferred)
  selectSnareBeatsForTransitions,
  calculateSnareTimedImageDurations,
  type DrumAnalysis,
} from "./beat-detection";
