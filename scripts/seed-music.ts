/**
 * Seed Music Tracks
 *
 * Uploads music files from the Music folder to Supabase Storage
 * and inserts metadata into the music_tracks table.
 * Analyzes each track for bass and snare hit timestamps using Python/librosa.
 *
 * Usage:
 *   npm run seed:music
 *
 * Requires:
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - Music files in the /Music folder
 *   - Python 3 with librosa, scipy, numpy, soundfile
 *
 * Install Python dependencies:
 *   pip install -r scripts/requirements.txt
 */

import { createClient } from "@supabase/supabase-js";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

const execAsync = promisify(exec);

// Load environment variables
config({ path: ".env.local" });

/**
 * Result from Python beat analyzer.
 */
interface DrumAnalysis {
  bass_hits: number[];
  snare_hits: number[];
  all_beats: number[];
  bpm: number;
  duration: number;
  bass_count: number;
  snare_count: number;
  error?: string;
}

/**
 * Check if Python with librosa is available.
 */
async function isPythonAvailable(): Promise<boolean> {
  try {
    await execAsync("python --version");
    // Check if librosa is installed
    await execAsync("python -c \"import librosa\"");
    return true;
  } catch {
    try {
      // Try python3 on some systems
      await execAsync("python3 --version");
      await execAsync("python3 -c \"import librosa\"");
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Get the Python command (python or python3).
 */
async function getPythonCommand(): Promise<string> {
  try {
    await execAsync("python -c \"import librosa\"");
    return "python";
  } catch {
    return "python3";
  }
}

/**
 * Analyze beats using Python librosa for bass/snare separation.
 */
async function analyzeBeatsWithPython(
  audioPath: string
): Promise<DrumAnalysis> {
  const pythonCmd = await getPythonCommand();
  const scriptPath = path.join(process.cwd(), "scripts", "analyze-beats.py");

  const cmd = `${pythonCmd} "${scriptPath}" "${audioPath}"`;
  const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });

  const result = JSON.parse(stdout.trim()) as DrumAnalysis;

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Simple fallback - generate evenly spaced "beats" based on duration.
 */
function generateFallbackBeats(duration: number): DrumAnalysis {
  const bpm = 120;
  const beatInterval = 60 / bpm;
  const beats: number[] = [];

  for (let t = beatInterval; t < duration; t += beatInterval) {
    beats.push(Math.round(t * 100) / 100);
  }

  // For fallback, put every other beat as "snare" (beats 2, 4, etc.)
  const bassHits: number[] = [];
  const snareHits: number[] = [];

  beats.forEach((beat, i) => {
    if (i % 2 === 0) {
      bassHits.push(beat);
    } else {
      snareHits.push(beat);
    }
  });

  return {
    bass_hits: bassHits,
    snare_hits: snareHits,
    all_beats: beats,
    bpm,
    duration,
    bass_count: bassHits.length,
    snare_count: snareHits.length,
  };
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Music folder path
const MUSIC_FOLDER = path.join(process.cwd(), "Music");

// Track metadata from Uppbeat - energy levels based on tags
interface TrackMeta {
  energy: "low" | "medium" | "high";
  tags: string[];
}

const TRACK_METADATA: Record<string, TrackMeta> = {
  // LOW - Calm, Chill, Lofi, Documentary
  "new-chapter": {
    energy: "low",
    tags: ["lofi beats", "chill", "calm", "relaxing"],
  },
  "reflection": {
    energy: "low",
    tags: ["jazzhop", "casual", "chill", "mellow"],
  },
  "juniper": {
    energy: "low",
    tags: ["lofi beats", "beats", "guitar", "dreamy"],
  },
  "from-the-soul": {
    energy: "low",
    tags: ["chillhop", "modern background", "vlog", "smooth"],
  },
  "afternoon-tea": {
    energy: "low",
    tags: ["jazzhop", "lofi beats", "bar", "sophisticated"],
  },
  "maple": {
    energy: "low",
    tags: ["chillhop", "beats", "guitar", "warm"],
  },
  "gems": {
    energy: "low",
    tags: ["lofi beats", "beats", "relaxing", "peaceful"],
  },
  "lucid-dreaming-acoustic": {
    energy: "low",
    tags: ["cinematic", "documentary", "emotional", "ambient"],
  },

  // MEDIUM - Uplifting, Business, Travel, Inspirational
  "if-you-like-it": {
    energy: "medium",
    tags: ["noughties", "r&b", "beats", "groovy"],
  },
  "bright-skies-ahead": {
    energy: "medium",
    tags: ["summer", "beats", "travel", "uplifting"],
  },
  "gentle-pulses": {
    energy: "medium",
    tags: ["business", "house", "uplifting", "corporate"],
  },
  "lady-love": {
    energy: "medium",
    tags: ["tropical", "amapiano", "travel", "vibrant"],
  },
  "together-we-rise": {
    energy: "medium",
    tags: ["inspirational", "cinematic", "adventure", "motivational"],
  },
  "essence-of-the-past": {
    energy: "medium",
    tags: ["funky", "beats", "acid jazz", "retro"],
  },
  "on-the-move": {
    energy: "medium",
    tags: ["trap", "stylish", "chill", "modern"],
  },
  "the-street-market": {
    energy: "medium",
    tags: ["loop", "hip-hop", "cool", "urban"],
  },
  "golden-era": {
    energy: "medium",
    tags: ["boom bap", "beats", "exciting", "nostalgic"],
  },

  // HIGH - Commercial, Funky, Promo, Energetic
  "bust-a-move": {
    energy: "high",
    tags: ["commercial", "funky", "promo", "energetic"],
  },
  "quick-stepper": {
    energy: "high",
    tags: ["funky", "promo", "cool", "dynamic"],
  },
  "big-stepper": {
    energy: "high",
    tags: ["stylish", "trap", "cool", "bold"],
  },
  "neon-sugar": {
    energy: "high",
    tags: ["travel", "house", "fun", "upbeat"],
  },
};

// Known artists for parsing
const KNOWN_ARTISTS = [
  "nicolas-kluzek",
  "stan-town",
  "skygaze",
  "yawnathan",
  "light-prism",
  "otto-mp3",
  "night-drift",
  "all-ambient",
  "konstantin-garbuzyuk",
  "vens-adams",
  "jeff-kaale",
  "a-t-m",
  "dope-cat",
  "moire",
  "danger-lion-x",
];

/**
 * Parse filename to extract metadata.
 * Format: {title}-{artist}-main-version-{id}-{mm}-{ss}.mp3
 */
function parseFilename(filename: string): {
  title: string;
  artist: string;
  duration: number;
  slug: string;
} {
  // Remove .mp3 extension
  const base = filename.replace(".mp3", "");

  // Split by "-main-version-"
  const parts = base.split("-main-version-");
  if (parts.length !== 2) {
    throw new Error(`Unexpected filename format: ${filename}`);
  }

  const titleArtist = parts[0];
  const versionDuration = parts[1];

  // Extract duration (last 5 chars: mm-ss)
  const durationMatch = versionDuration.match(/(\d{2})-(\d{2})$/);
  if (!durationMatch) {
    throw new Error(`Could not parse duration from: ${filename}`);
  }

  const minutes = parseInt(durationMatch[1], 10);
  const seconds = parseInt(durationMatch[2], 10);
  const duration = minutes * 60 + seconds;

  // Parse title and artist
  let artist = "";
  let title = titleArtist;

  for (const knownArtist of KNOWN_ARTISTS) {
    if (titleArtist.endsWith(`-${knownArtist}`)) {
      artist = knownArtist
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      title = titleArtist.slice(0, -(knownArtist.length + 1));
      break;
    }
  }

  // Convert title from kebab-case to Title Case
  const formattedTitle = title
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return {
    title: formattedTitle,
    artist,
    duration,
    slug: title, // Keep kebab-case for metadata lookup
  };
}

async function seedMusic() {
  console.log("Starting music seed...\n");

  // Check if Music folder exists
  if (!fs.existsSync(MUSIC_FOLDER)) {
    console.error(`Music folder not found: ${MUSIC_FOLDER}`);
    process.exit(1);
  }

  // Get all MP3 files
  const files = fs.readdirSync(MUSIC_FOLDER).filter((f) => f.endsWith(".mp3"));

  if (files.length === 0) {
    console.error("No MP3 files found in Music folder");
    process.exit(1);
  }

  console.log(`Found ${files.length} music files\n`);

  // Check for Python/librosa availability
  const hasPython = await isPythonAvailable();
  if (hasPython) {
    console.log("✓ Python + librosa detected - using bass/snare separation\n");
  } else {
    console.log("⚠ Python/librosa not found - using fallback beat detection");
    console.log("  Install dependencies for bass/snare separation:");
    console.log("    pip install -r scripts/requirements.txt\n");
  }

  let successCount = 0;
  let errorCount = 0;

  // Process each file
  for (const filename of files) {
    try {
      console.log(`Processing: ${filename}`);

      // Parse metadata from filename
      const { title, artist, duration, slug } = parseFilename(filename);

      // Get energy and tags from metadata map
      const meta = TRACK_METADATA[slug] || { energy: "medium", tags: [] };
      const energy = meta.energy;
      const tags = meta.tags;

      console.log(`  Title: ${title}`);
      console.log(`  Artist: ${artist}`);
      console.log(`  Duration: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")}`);
      console.log(`  Energy: ${energy}`);
      console.log(`  Tags: ${tags.join(", ")}`);

      // Read file
      const filePath = path.join(MUSIC_FOLDER, filename);
      const fileBuffer = fs.readFileSync(filePath);

      // Upload to Supabase Storage
      const storagePath = `tracks/${filename}`;
      const { error: uploadError } = await supabase.storage
        .from("music")
        .upload(storagePath, fileBuffer, {
          contentType: "audio/mpeg",
          upsert: true,
        });

      if (uploadError) {
        console.error(`  Upload error: ${uploadError.message}`);
        errorCount++;
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("music")
        .getPublicUrl(storagePath);

      const fileUrl = urlData.publicUrl;
      console.log(`  Uploaded: ${fileUrl}`);

      // Analyze beats with bass/snare separation
      let analysis: DrumAnalysis;

      if (hasPython) {
        try {
          analysis = await analyzeBeatsWithPython(filePath);
          console.log(`  Bass hits: ${analysis.bass_count}, Snare hits: ${analysis.snare_count} (${analysis.bpm} BPM)`);
        } catch (error) {
          console.warn(`  Beat detection failed, using fallback: ${error}`);
          analysis = generateFallbackBeats(duration);
        }
      } else {
        analysis = generateFallbackBeats(duration);
        console.log(`  Fallback beats: ${analysis.all_beats.length} (estimated ${analysis.bpm} BPM)`);
      }

      // Insert into database
      const { error: insertError } = await supabase.from("music_tracks").upsert(
        {
          title,
          artist,
          duration,
          energy,
          tags,
          file_path: storagePath,
          file_url: fileUrl,
          preview_url: fileUrl,
          source: "library",
          is_active: true,
          beats: analysis.all_beats,
          bpm: analysis.bpm,
          bass_hits: analysis.bass_hits,
          snare_hits: analysis.snare_hits,
        },
        {
          onConflict: "file_path",
        }
      );

      if (insertError) {
        console.error(`  Database error: ${insertError.message}`);
        errorCount++;
        continue;
      }

      console.log(`  Saved to database`);
      console.log("");
      successCount++;
    } catch (error) {
      console.error(`  Error: ${error}`);
      errorCount++;
    }
  }

  console.log("\n========================================");
  console.log(`Music seed complete!`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Errors: ${errorCount}`);
  console.log("========================================\n");

  // Summary by energy level
  const { data: counts } = await supabase
    .from("music_tracks")
    .select("energy")
    .eq("is_active", true);

  if (counts) {
    const energyCounts = counts.reduce(
      (acc, track) => {
        acc[track.energy] = (acc[track.energy] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    console.log("Tracks by energy level:");
    console.log(`  Low (Calm): ${energyCounts["low"] || 0}`);
    console.log(`  Medium (Balanced): ${energyCounts["medium"] || 0}`);
    console.log(`  High (Energetic): ${energyCounts["high"] || 0}`);
  }
}

// Run the seed
seedMusic().catch(console.error);
