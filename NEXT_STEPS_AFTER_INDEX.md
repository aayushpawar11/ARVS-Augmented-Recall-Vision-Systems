# Next Steps - Your Index is Ready! ✅

## ✅ Step 1: Install Dependencies (If Not Done)

Open terminal/PowerShell in your project root and run:

```bash
cd server
npm install
```

This installs:
- `@xenova/transformers` (CLIP embeddings)
- `fluent-ffmpeg` (video processing)
- `ffmpeg-static` (FFmpeg binary)

**Expected:** Should complete in 30-60 seconds

---

## ✅ Step 2: Verify Your .env File

Make sure `server/.env` exists and has:

```env
GEMINI_API_KEY=your_key_here
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/memoryglass?retryWrites=true&w=majority
PORT=3001
```

**Check if it exists:**
```bash
cd server
dir .env    # Windows - should show the file
```

If it doesn't exist, create it with the variables above.

---

## ✅ Step 3: Start the Server

In terminal/PowerShell:

```bash
cd server
npm run dev
```

**What you should see:**
```
✅ Connected to MongoDB Atlas
✅ Gemini AI initialized
✅ Solana connection initialized
🚀 MemoryGlass API server running on port 3001
```

**If you see errors:**
- "Cannot find module" → Run `npm install` in server directory
- "MongoDB connection error" → Check your `.env` file
- "GEMINI_API_KEY not set" → Add it to `server/.env`

---

## ✅ Step 4: Test the System

### Test 1: Health Check

Open browser and go to:
```
http://localhost:3001/api/health
```

**Expected response:**
```json
{
  "status": "ok",
  "services": {
    "mongodb": true,
    "gemini": true,
    "solana": true
  }
}
```

### Test 2: Upload a Video

1. Open your frontend: http://localhost:8080/dashboard
2. Go to "Upload Video" tab
3. Select a test video file
4. Click "Upload Video"

**Watch the server console - you should see:**
```
📹 Extracting X frames from video...
✅ Extracted X frames
🔄 Loading CLIP model (first time may download ~500MB)...
✅ CLIP model loaded
🔢 Generating embeddings for X frames...
✅ Generated X embeddings
✅ Stored X embeddings for video [videoId]
✅ Vector processing complete for video [videoId]
```

**Note:** First time will download CLIP model (~500MB, takes 5-10 minutes). This is one-time only.

### Test 3: Query the Video

1. Go to "Search Memories" tab
2. Type: "Where did I leave my water bottle?" (or any object in your video)
3. Click search

**Watch the server console:**
```
🔢 Generating embeddings for query...
🔍 Vector search executing...
✅ Found X matches
```

**Expected:** Results appear in 0.1-0.5 seconds (much faster than before!)

---

## 🎯 You're All Set!

Once the server is running and you've tested with a video upload, your vectorized recall system is fully operational!

**What works now:**
- ✅ Video uploads are vectorized automatically
- ✅ Queries use fast vector search (no Gemini API calls for location queries)
- ✅ Live streaming is vectorized in real-time
- ✅ Everything is searchable instantly

---

## 🐛 Quick Troubleshooting

**Server won't start?**
- Check `npm install` completed successfully
- Verify `.env` file exists with correct values
- Check MongoDB connection string is correct

**Video upload fails?**
- Check console for specific error
- Verify video file is valid (try MP4 format)
- Check disk space (frames are temporarily stored)

**Queries return no results?**
- Make sure video finished processing (check console logs)
- Verify embeddings were stored (check MongoDB `video_embeddings` collection)
- Wait for CLIP model to finish downloading (first time only)

**Vector search error?**
- Verify index status is "Ready" or "Active" in MongoDB Atlas
- Check index name is exactly `vector_index`
- Try refreshing MongoDB Atlas page

---

## 🚀 Ready to Go!

Your system is ready! Upload a video and try a query to see the speed improvement!

