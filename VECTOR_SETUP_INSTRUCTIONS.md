# Vectorized Recall System - Setup Instructions

## Overview

The vectorized recall system has been implemented. This guide will help you set it up and get it running.

## Prerequisites

1. **Install Dependencies**

   Navigate to the `server` directory and install the required packages:

   ```bash
   cd server
   npm install @xenova/transformers fluent-ffmpeg ffmpeg-static
   ```

   **Note:** The first time you run the application, CLIP model will download (~500MB). This is a one-time download.

2. **FFmpeg Installation**

   The `ffmpeg-static` package includes a pre-built FFmpeg binary, so no separate installation is needed. However, if you encounter issues, you may need to install FFmpeg system-wide.

## MongoDB Atlas Vector Search Setup

### Step 1: Create the Vector Search Index

Vector search indexes must be created through the MongoDB Atlas UI (they cannot be created programmatically).

1. **Go to MongoDB Atlas:**
   - Log in to [MongoDB Atlas](https://cloud.mongodb.com)
   - Navigate to your cluster

2. **Create Search Index:**
   - Click on **"Search"** in the left sidebar
   - Click **"Create Search Index"**
   - Choose **"JSON Editor"** (not the visual editor)
   - Select:
     - **Database:** `memoryglass`
     - **Collection:** `video_embeddings`
   - **Index Name:** `vector_index` (must be exactly this name)

3. **Paste the Index Definition:**

   ```json
   {
     "name": "vector_index",
     "type": "vectorSearch",
     "definition": {
       "fields": [
         {
           "type": "vector",
           "path": "embedding",
           "numDimensions": 512,
           "similarity": "cosine"
         }
       ]
     }
   }
   ```

4. **Create the Index:**
   - Click **"Next"**
   - Review the configuration
   - Click **"Create Search Index"**
   - Wait for the index to build (may take a few minutes)

### Step 2: Verify Index Status

- The index status will show as "Active" when ready
- You can query the collection once the index is active

## Testing the Setup

### 1. Test Frame Extraction

Upload a test video and check the console logs:

```
📹 Extracting X frames from video (Y duration)
✅ Extracted X frames
```

### 2. Test Embedding Generation

You should see:

```
🔄 Loading CLIP model (first time may download ~500MB)...
✅ CLIP model loaded
🔢 Generating embeddings for X frames...
✅ Generated X embeddings
```

### 3. Test Vector Storage

Check MongoDB Atlas to verify embeddings are stored:

- Go to your cluster → Browse Collections
- Select `video_embeddings` collection
- You should see documents with `embedding` arrays (512 numbers each)

### 4. Test Vector Search

Try a query like "Where did I leave my water bottle?" and check:

- Console should show vector search executing
- Results should return with confidence scores
- No Gemini API calls for location queries (check your API usage)

## Troubleshooting

### Issue: "Vector search index not found"

**Solution:** 
- Verify the index is created in MongoDB Atlas
- Check the index name is exactly `vector_index`
- Ensure the index status is "Active"
- Wait a few minutes if you just created it

### Issue: "CLIP model download fails"

**Solution:**
- Check your internet connection
- The model downloads to `~/.cache/huggingface/` by default
- You can manually download and place it there if needed
- First download may take 5-10 minutes depending on connection

### Issue: "FFmpeg not found"

**Solution:**
- The `ffmpeg-static` package should include FFmpeg
- If issues persist, install FFmpeg system-wide:
  - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html)
  - Mac: `brew install ffmpeg`
  - Linux: `sudo apt-get install ffmpeg` (Ubuntu/Debian)

### Issue: "No frames extracted"

**Solution:**
- Check video file format (MP4, WebM, MOV should work)
- Verify video file is not corrupted
- Check file permissions
- Ensure `server/frames/` directory is writable

### Issue: "Embedding dimensions mismatch"

**Solution:**
- CLIP vit-base-patch32 produces 512-dimensional embeddings
- Ensure MongoDB index definition uses `numDimensions: 512`
- If using a different model, update both code and index

### Issue: "Vector search returns no results"

**Solution:**
- Verify embeddings are stored in `video_embeddings` collection
- Check that `userId` matches in both query and stored embeddings
- Try increasing `numCandidates` in the search query
- Verify the index is active and built

## Performance Notes

- **First video processing:** May take 2-5 minutes (model download + processing)
- **Subsequent videos:** 30 seconds - 2 minutes depending on video length
- **Query speed:** Should be 0.1-0.5 seconds (much faster than Gemini)

## Migration from Old System

The new system is backward compatible:

- Old videos (without embeddings) will fall back to Gemini search
- New videos will use vector search
- You can gradually migrate old videos by re-processing them

## Cost Savings

- **Before:** ~$0.001-0.003 per query (Gemini API)
- **After:** $0 per query (vector search is free)
- **Processing:** One-time cost per video (CLIP is free, or minimal Gemini cost)

For 100 queries/day:
- **Old system:** ~$3-9/month
- **New system:** ~$0-2/month (only processing costs)

## Next Steps

1. ✅ Install dependencies
2. ✅ Create MongoDB vector search index
3. ✅ Test with a sample video upload
4. ✅ Test queries
5. Monitor performance and adjust frame extraction rate if needed
6. Consider migrating old videos to vector format

## Support

If you encounter issues:

1. Check console logs for detailed error messages
2. Verify MongoDB Atlas index is active
3. Check that all dependencies are installed
4. Ensure video files are in supported formats
5. Review the troubleshooting section above

The system will automatically fall back to the old Gemini-based search if vector search fails, so your application will continue working even if there are issues.



