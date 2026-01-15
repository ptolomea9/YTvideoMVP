import express, { Request, Response } from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuid } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const TEMP_DIR = '/tmp/ffmpeg';

// Ensure temp directory exists
async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (error) {
    // Directory may already exist
  }
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'ffmpeg-pingpong' });
});

/**
 * POST /pingpong
 * Creates a ping-pong (forward + reversed) video from a source URL
 *
 * Body: { videoUrl: string, targetDuration?: number }
 * Returns: { url: string } - Public URL of the processed video
 */
app.post('/pingpong', async (req: Request, res: Response) => {
  const { videoUrl, targetDuration } = req.body;

  if (!videoUrl) {
    return res.status(400).json({ error: 'videoUrl is required' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Supabase configuration missing' });
  }

  const jobId = uuid();
  const inputFile = path.join(TEMP_DIR, `${jobId}_input.mp4`);
  const reversedFile = path.join(TEMP_DIR, `${jobId}_reversed.mp4`);
  const concatList = path.join(TEMP_DIR, `${jobId}_concat.txt`);
  const pingpongFile = path.join(TEMP_DIR, `${jobId}_pingpong.mp4`);
  const outputFile = path.join(TEMP_DIR, `${jobId}_output.mp4`);

  const tempFiles = [inputFile, reversedFile, concatList, pingpongFile, outputFile];

  try {
    await ensureTempDir();

    console.log(`[${jobId}] Starting ping-pong processing for: ${videoUrl}`);

    // 1. Download source video
    console.log(`[${jobId}] Downloading source video...`);
    await execAsync(`curl -L -o "${inputFile}" "${videoUrl}"`);

    // 2. Get source video duration
    const { stdout: durationOutput } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputFile}"`
    );
    const sourceDuration = parseFloat(durationOutput.trim());
    console.log(`[${jobId}] Source duration: ${sourceDuration}s`);

    // 3. Create reversed version (video and audio)
    console.log(`[${jobId}] Creating reversed version...`);
    await execAsync(
      `ffmpeg -y -i "${inputFile}" -vf "reverse" -af "areverse" "${reversedFile}"`
    );

    // 4. Create concat file and merge forward + reversed
    console.log(`[${jobId}] Concatenating forward + reversed...`);
    await fs.writeFile(concatList, `file '${inputFile}'\nfile '${reversedFile}'`);
    await execAsync(
      `ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${pingpongFile}"`
    );

    // 5. Trim to target duration if specified
    let finalFile = pingpongFile;
    if (targetDuration && targetDuration < sourceDuration * 2) {
      console.log(`[${jobId}] Trimming to ${targetDuration}s...`);
      await execAsync(
        `ffmpeg -y -i "${pingpongFile}" -t ${targetDuration} -c copy "${outputFile}"`
      );
      finalFile = outputFile;
    }

    // 6. Upload to Supabase Storage
    console.log(`[${jobId}] Uploading to Supabase Storage...`);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const fileBuffer = await fs.readFile(finalFile);
    const storagePath = `pingpong/${jobId}.mp4`;

    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(storagePath, fileBuffer, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // 7. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(storagePath);

    console.log(`[${jobId}] Processing complete. URL: ${publicUrl}`);

    // 8. Cleanup temp files
    await Promise.all(
      tempFiles.map((f) => fs.unlink(f).catch(() => {}))
    );

    res.json({
      url: publicUrl,
      originalDuration: sourceDuration,
      pingpongDuration: sourceDuration * 2,
      finalDuration: targetDuration || sourceDuration * 2
    });

  } catch (error) {
    console.error(`[${jobId}] Error:`, error);

    // Cleanup on error
    await Promise.all(
      tempFiles.map((f) => fs.unlink(f).catch(() => {}))
    );

    res.status(500).json({
      error: 'FFmpeg processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.listen(PORT, () => {
  console.log(`FFmpeg Ping-Pong Service running on port ${PORT}`);
});
