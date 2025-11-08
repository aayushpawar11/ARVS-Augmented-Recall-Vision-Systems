// Script to clean up old video metadata and reduce MongoDB storage
// Run this periodically to archive or delete old video records

import { MongoClient, ObjectId } from 'mongodb';
import { config } from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function cleanupOldVideos() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    const db = client.db('memoryglass');
    const videosCollection = db.collection('videos');

    // Option 1: Archive videos older than 30 days (keep summary, remove detailed arrays)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldVideos = await videosCollection.find({
      uploadedAt: { $lt: thirtyDaysAgo }
    }).toArray();

    console.log(`Found ${oldVideos.length} videos older than 30 days`);

    for (const video of oldVideos) {
      // Archive: Keep only essential data
      await videosCollection.updateOne(
        { _id: video._id },
        {
          $set: {
            archived: true,
            archivedAt: new Date(),
            // Keep only summary and top objects
            objects: (video.objects || []).slice(0, 10),
            activities: [],
            people: [],
            scenes: [],
            summary: (video.summary || '').substring(0, 500)
          }
        }
      );
      
      // Optionally delete the video file from disk
      if (video.videoPath && await fs.access(video.videoPath).then(() => true).catch(() => false)) {
        try {
          await fs.unlink(video.videoPath);
          console.log(`Deleted video file: ${video.filename}`);
        } catch (err) {
          console.error(`Error deleting file ${video.videoPath}:`, err.message);
        }
      }
    }

    console.log(`✅ Archived ${oldVideos.length} old videos`);

    // Option 2: Delete videos older than 90 days completely
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const veryOldVideos = await videosCollection.find({
      uploadedAt: { $lt: ninetyDaysAgo }
    }).toArray();

    console.log(`Found ${veryOldVideos.length} videos older than 90 days to delete`);

    for (const video of veryOldVideos) {
      // Delete video file
      if (video.videoPath && await fs.access(video.videoPath).then(() => true).catch(() => false)) {
        try {
          await fs.unlink(video.videoPath);
        } catch (err) {
          console.error(`Error deleting file ${video.videoPath}:`, err.message);
        }
      }
    }

    // Delete from MongoDB
    const deleteResult = await videosCollection.deleteMany({
      uploadedAt: { $lt: ninetyDaysAgo }
    });

    console.log(`✅ Deleted ${deleteResult.deletedCount} very old videos`);

    // Get storage stats
    const stats = await db.stats();
    console.log(`\n📊 Database size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📊 Storage size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await client.close();
  }
}

cleanupOldVideos();

