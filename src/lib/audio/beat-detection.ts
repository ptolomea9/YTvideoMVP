/**
 * Beat Detection Utility
 *
 * Provides utilities for working with pre-analyzed beat data from the database.
 * Beat analysis is done at seed time using Python/librosa for bass/snare separation.
 *
 * For real-time analysis, use the Python script: scripts/analyze-beats.py
 */

import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

/**
 * Legacy beat analysis interface (for backwards compatibility).
 */
export interface BeatAnalysis {
  beats: number[]; // Timestamps in seconds
  bpm: number | null; // Estimated BPM
  method: "aubio" | "fallback";
}

/**
 * Drum-separated beat analysis.
 * Bass hits are kick drum (low frequency), snare hits are snare drum (mid frequency).
 */
export interface DrumAnalysis {
  bassHits: number[]; // Kick drum timestamps in seconds
  snareHits: number[]; // Snare drum timestamps in seconds
  allBeats: number[]; // Combined (for backwards compatibility)
  bpm: number | null;
}

/**
 * Check if aubio CLI tools are available.
 */
async function isAubioAvailable(): Promise<boolean> {
  try {
    await execAsync("aubioonset --help");
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect beats using aubio CLI.
 *
 * @param audioPath - Path to the audio file
 * @param options - Detection options
 */
async function detectBeatsWithAubio(
  audioPath: string,
  options: {
    method?: "default" | "energy" | "hfc" | "complex" | "specflux";
    silence?: number; // dB threshold, default -40
    minBeatInterval?: number; // Minimum seconds between beats
  } = {}
): Promise<BeatAnalysis> {
  const {
    method = "default",
    silence = -40,
    minBeatInterval = 0.2,
  } = options;

  // Get onset timestamps using aubioonset
  const onsetCmd = `aubioonset -i "${audioPath}" -O ${method} -s ${silence} -t seconds`;
  const { stdout: onsetOutput } = await execAsync(onsetCmd);

  // Parse onset timestamps
  let beats = onsetOutput
    .trim()
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => parseFloat(line.trim()))
    .filter((t) => !isNaN(t));

  // Filter out beats that are too close together
  beats = filterCloseBeats(beats, minBeatInterval);

  // Get BPM using aubiotrack
  let bpm: number | null = null;
  try {
    const bpmCmd = `aubiotrack -i "${audioPath}" -t seconds`;
    const { stdout: bpmOutput } = await execAsync(bpmCmd);
    const bpmBeats = bpmOutput
      .trim()
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => parseFloat(line.trim()))
      .filter((t) => !isNaN(t));

    if (bpmBeats.length >= 2) {
      // Calculate BPM from beat intervals
      const intervals = [];
      for (let i = 1; i < Math.min(bpmBeats.length, 20); i++) {
        intervals.push(bpmBeats[i] - bpmBeats[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      bpm = Math.round(60 / avgInterval);
    }
  } catch (error) {
    console.warn("Could not determine BPM:", error);
  }

  return {
    beats,
    bpm,
    method: "aubio",
  };
}

/**
 * Simple fallback beat detection using FFmpeg for audio analysis.
 * Less accurate but works without aubio.
 */
async function detectBeatsWithFallback(
  audioPath: string
): Promise<BeatAnalysis> {
  // Use FFmpeg to get volume levels over time
  const cmd = `ffmpeg -i "${audioPath}" -af "volumedetect" -f null - 2>&1`;

  try {
    const { stdout } = await execAsync(cmd);

    // Parse mean volume to estimate a baseline
    const meanMatch = stdout.match(/mean_volume: ([-\d.]+) dB/);
    const maxMatch = stdout.match(/max_volume: ([-\d.]+) dB/);

    if (!meanMatch || !maxMatch) {
      throw new Error("Could not parse volume data");
    }

    // For a more accurate fallback, we'd need to analyze the audio in chunks
    // This is a simplified version that estimates beats based on duration
    const durationMatch = stdout.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
    if (!durationMatch) {
      throw new Error("Could not parse duration");
    }

    const hours = parseInt(durationMatch[1]);
    const minutes = parseInt(durationMatch[2]);
    const seconds = parseFloat(durationMatch[3]);
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;

    // Generate estimated beats at ~120 BPM (common tempo)
    // This is a fallback - real beat detection requires proper analysis
    const estimatedBpm = 120;
    const beatInterval = 60 / estimatedBpm;
    const beats: number[] = [];

    for (let t = 0; t < totalSeconds; t += beatInterval) {
      beats.push(Math.round(t * 100) / 100);
    }

    return {
      beats,
      bpm: estimatedBpm,
      method: "fallback",
    };
  } catch (error) {
    console.error("Fallback beat detection failed:", error);
    return {
      beats: [],
      bpm: null,
      method: "fallback",
    };
  }
}

/**
 * Filter out beats that are too close together.
 */
function filterCloseBeats(beats: number[], minInterval: number): number[] {
  if (beats.length === 0) return beats;

  const filtered: number[] = [beats[0]];

  for (let i = 1; i < beats.length; i++) {
    if (beats[i] - filtered[filtered.length - 1] >= minInterval) {
      filtered.push(beats[i]);
    }
  }

  return filtered;
}

/**
 * Select representative beats for video transitions.
 *
 * Given a track's beats and a desired number of transitions,
 * returns evenly-distributed beat timestamps.
 *
 * @param beats - All detected beat timestamps
 * @param numTransitions - Desired number of image transitions
 * @param trackDuration - Total track duration in seconds
 */
export function selectTransitionBeats(
  beats: number[],
  numTransitions: number,
  trackDuration: number
): number[] {
  if (beats.length === 0 || numTransitions <= 0) {
    // Fallback to even distribution
    const interval = trackDuration / (numTransitions + 1);
    return Array.from({ length: numTransitions }, (_, i) =>
      Math.round((i + 1) * interval * 100) / 100
    );
  }

  if (beats.length <= numTransitions) {
    return beats;
  }

  // Select evenly spaced beats
  const selected: number[] = [];
  const step = beats.length / numTransitions;

  for (let i = 0; i < numTransitions; i++) {
    const index = Math.floor(i * step);
    selected.push(beats[index]);
  }

  return selected;
}

/**
 * Select snare hits for image transitions.
 *
 * Snare hits typically land on beats 2 and 4 in most music,
 * making them ideal for image transitions as they provide
 * a natural "punch" that drives visual changes.
 *
 * @param snareHits - Detected snare hit timestamps
 * @param numTransitions - Desired number of image transitions
 * @param trackDuration - Total track duration in seconds
 * @param options - Additional options
 */
export function selectSnareBeatsForTransitions(
  snareHits: number[],
  numTransitions: number,
  trackDuration: number,
  options: {
    minInterval?: number; // Minimum seconds between selected snares
    preferStrongBeats?: boolean; // Prefer snares closer to expected 2/4 positions
  } = {}
): number[] {
  const { minInterval = 1.5, preferStrongBeats = false } = options;

  if (snareHits.length === 0 || numTransitions <= 0) {
    // Fallback to even distribution
    const interval = trackDuration / (numTransitions + 1);
    return Array.from({ length: numTransitions }, (_, i) =>
      Math.round((i + 1) * interval * 100) / 100
    );
  }

  // Filter snares to ensure minimum interval
  const filtered: number[] = [];
  for (const hit of snareHits) {
    if (filtered.length === 0 || hit - filtered[filtered.length - 1] >= minInterval) {
      filtered.push(hit);
    }
  }

  if (filtered.length <= numTransitions) {
    return filtered;
  }

  // Select evenly distributed snare hits
  const selected: number[] = [];
  const step = filtered.length / numTransitions;

  for (let i = 0; i < numTransitions; i++) {
    const index = Math.floor(i * step);
    selected.push(filtered[index]);
  }

  return selected;
}

/**
 * Calculate image display durations based on snare hit timestamps.
 *
 * Uses snare hits for transitions to create punchy, beat-synced visuals.
 *
 * @param snareHits - Snare hit timestamps
 * @param numImages - Number of images to display
 * @param totalDuration - Total video duration
 * @param options - Timing options
 */
export function calculateSnareTimedImageDurations(
  snareHits: number[],
  numImages: number,
  totalDuration: number,
  options: {
    fadeMs?: number; // Fade duration in milliseconds
    minImageDuration?: number; // Minimum seconds per image
  } = {}
): Array<{ start: number; duration: number; fadeIn?: number; fadeOut?: number }> {
  const { fadeMs = 200, minImageDuration = 2 } = options;
  const fadeSeconds = fadeMs / 1000;

  // Select snare hits for transitions
  const transitionSnares = selectSnareBeatsForTransitions(
    snareHits,
    numImages - 1,
    totalDuration,
    { minInterval: minImageDuration }
  );

  const timings: Array<{ start: number; duration: number; fadeIn?: number; fadeOut?: number }> = [];
  let currentStart = 0;

  for (let i = 0; i < numImages; i++) {
    if (i < transitionSnares.length) {
      const duration = transitionSnares[i] - currentStart;
      timings.push({
        start: Math.round(currentStart * 100) / 100,
        duration: Math.round(duration * 100) / 100,
        fadeIn: i === 0 ? undefined : fadeSeconds,
        fadeOut: fadeSeconds,
      });
      currentStart = transitionSnares[i];
    } else {
      // Last image
      const duration = totalDuration - currentStart;
      timings.push({
        start: Math.round(currentStart * 100) / 100,
        duration: Math.round(duration * 100) / 100,
        fadeIn: timings.length === 0 ? undefined : fadeSeconds,
        fadeOut: undefined, // No fade out on last image
      });
    }
  }

  return timings;
}

/**
 * Analyze audio file for beats.
 *
 * @param audioPath - Path to the audio file
 * @returns Beat analysis results
 */
export async function analyzeBeats(audioPath: string): Promise<BeatAnalysis> {
  // Verify file exists
  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`);
  }

  // Check if aubio is available
  const hasAubio = await isAubioAvailable();

  if (hasAubio) {
    console.log("  Using aubio for beat detection...");
    return detectBeatsWithAubio(audioPath);
  } else {
    console.log("  Aubio not found, using fallback beat detection...");
    console.log("  For better results, install aubio: https://aubio.org/download");
    return detectBeatsWithFallback(audioPath);
  }
}

/**
 * Calculate image display durations based on beat timestamps.
 *
 * @param beats - Beat timestamps for transitions
 * @param numImages - Number of images to display
 * @param totalDuration - Total video duration
 * @returns Array of { start, duration } for each image
 */
export function calculateImageTimings(
  beats: number[],
  numImages: number,
  totalDuration: number
): Array<{ start: number; duration: number }> {
  const timings: Array<{ start: number; duration: number }> = [];

  // If we don't have enough beats, create evenly-spaced timings
  if (beats.length < numImages - 1) {
    const imageDuration = totalDuration / numImages;
    for (let i = 0; i < numImages; i++) {
      timings.push({
        start: i * imageDuration,
        duration: imageDuration,
      });
    }
    return timings;
  }

  // Select beats for transitions (we need numImages - 1 transitions)
  const transitionBeats = selectTransitionBeats(beats, numImages - 1, totalDuration);

  // First image starts at 0
  let currentStart = 0;

  for (let i = 0; i < numImages; i++) {
    if (i < transitionBeats.length) {
      // Duration is until the next beat
      const duration = transitionBeats[i] - currentStart;
      timings.push({
        start: Math.round(currentStart * 100) / 100,
        duration: Math.round(duration * 100) / 100,
      });
      currentStart = transitionBeats[i];
    } else {
      // Last image - duration until end
      const duration = totalDuration - currentStart;
      timings.push({
        start: Math.round(currentStart * 100) / 100,
        duration: Math.round(duration * 100) / 100,
      });
    }
  }

  return timings;
}
