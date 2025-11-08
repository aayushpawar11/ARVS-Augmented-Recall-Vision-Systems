# Storage Optimization Guide

## Problem
MongoDB is filling up quickly with video metadata. 4 videos (3 seconds each, 1080p 30fps) are taking ~100MB.

## Solutions Implemented

### 1. **Limited Array Sizes**
- Objects: Limited to top 50 most confident detections
- Activities: Limited to top 20
- People: Limited to top 10
- Scenes: Limited to top 10
- Summary: Limited to 1000 characters

### 2. **Database Indexes**
Indexes created to optimize queries and reduce storage overhead:
- `userId + uploadedAt` (for fast user queries)
- Text index on `objects.object` and `summary` (for search)

### 3. **Query Optimizations**
- Limited video queries to recent 50 videos
- Used `.project()` to only fetch needed fields
- Limited array sizes in prompts sent to Gemini

### 4. **Cleanup Script**
Created `server/cleanup-old-videos.js` to:
- Archive videos older than 30 days (remove detailed arrays, keep summary)
- Delete videos older than 90 days completely
- Clean up video files from disk

## Running Cleanup

```bash
cd server
node cleanup-old-videos.js
```

Or add to cron for automatic cleanup:
```bash
# Run daily at 2 AM
0 2 * * * cd /path/to/project/server && node cleanup-old-videos.js
```

## Expected Storage Reduction

**Before:**
- 4 videos: ~100MB
- Per video: ~25MB

**After:**
- 4 videos: ~2-5MB (80-95% reduction)
- Per video: ~0.5-1.2MB

## Monitoring Storage

Check MongoDB storage usage:
```javascript
// In MongoDB shell or via API
db.stats()
```

## Best Practices

1. **Run cleanup regularly** - Set up a cron job or scheduled task
2. **Monitor storage** - Check database size weekly
3. **Archive old videos** - Keep summaries, remove detailed data
4. **Delete very old videos** - Remove after 90 days if not needed
5. **Use video compression** - Compress videos before upload if possible

## Video File Storage

Video files are stored on disk in `server/uploads/`, NOT in MongoDB. To reduce disk usage:

1. Compress videos before upload
2. Delete old video files (cleanup script does this)
3. Use video compression tools (ffmpeg) to reduce file size

## Further Optimization Options

1. **Use GridFS** for large metadata (not recommended for this use case)
2. **Separate collections** - Store objects/activities in separate collections with references
3. **Compress JSON** - Use compression for stored metadata (adds complexity)
4. **External storage** - Store video files in S3/cloud storage

