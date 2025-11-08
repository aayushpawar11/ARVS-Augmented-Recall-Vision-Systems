import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

/**
 * Extract frames from video at regular intervals
 * @param {string} videoPath - Path to video file
 * @param {number} intervalSeconds - Interval between frames in seconds (default: 1.0)
 * @returns {Promise<Array>} Array of frame objects with path and timestamp
 */
export async function extractFrames(videoPath, intervalSeconds = 1.0) {
  try {
    // Create frames directory
    const framesDir = path.join(__dirname, '..', 'frames');
    await fs.mkdir(framesDir, { recursive: true });

    // Get video duration
    const duration = await getVideoDuration(videoPath);
    
    // Generate unique prefix for this video
    const videoId = path.basename(videoPath, path.extname(videoPath));
    const frames = [];
    
    // Extract frames at intervals
    const frameCount = Math.ceil(duration / intervalSeconds);
    
    console.log(`📹 Extracting ${frameCount} frames from video (${duration.toFixed(1)}s duration)`);
    
    for (let i = 0; i < frameCount; i++) {
      const timestamp = i * intervalSeconds;
      const framePath = path.join(framesDir, `${videoId}_frame_${String(i).padStart(6, '0')}.jpg`);
      
      await extractFrameAtTime(videoPath, framePath, timestamp);
      
      frames.push({
        path: framePath,
        timestamp: timestamp,
        frameNumber: i
      });
    }
    
    console.log(`✅ Extracted ${frames.length} frames`);
    return frames;
  } catch (error) {
    console.error('Error extracting frames:', error);
    throw error;
  }
}

/**
 * Get video duration in seconds
 */
function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      const duration = metadata.format.duration || 0;
      resolve(duration);
    });
  });
}

/**
 * Extract a single frame at specific timestamp
 */
function extractFrameAtTime(videoPath, outputPath, timestamp) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(timestamp)
      .frames(1)
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

/**
 * Clean up extracted frames
 */
export async function cleanupFrames(framePaths) {
  try {
    for (const framePath of framePaths) {
      await fs.unlink(framePath).catch(() => {
        // Ignore errors if file doesn't exist
      });
    }
    console.log(`🧹 Cleaned up ${framePaths.length} frame files`);
  } catch (error) {
    console.error('Error cleaning up frames:', error);
  }
}

