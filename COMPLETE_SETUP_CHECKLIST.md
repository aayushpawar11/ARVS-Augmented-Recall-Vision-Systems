# Complete Setup Checklist - Vectorized Recall System

Follow these steps in order to get everything running.

---

## ✅ Step 1: Install Dependencies

### Option A: Using npm (Recommended)

Open terminal/PowerShell in the project root and run:

```bash
cd server
npm install
```

This will install all dependencies including the new ones:
- `@xenova/transformers` (CLIP embeddings)
- `fluent-ffmpeg` (video processing)
- `ffmpeg-static` (FFmpeg binary)

**Expected output:**
```
added 150 packages in 30s
```

### Option B: Using the setup script (Windows)

Double-click `setup-vector-system.bat` in the project root.

### Verify Installation

Check if packages are installed:
```bash
cd server
npm list @xenova/transformers fluent-ffmpeg ffmpeg-static
```

You should see all three packages listed.

---

## ✅ Step 2: Create MongoDB Vector Search Index

**This is REQUIRED - the system won't work without it!**

### 2.1: Go to MongoDB Atlas

1. Open your browser
2. Go to: https://cloud.mongodb.com
3. Log in to your account
4. Click on your cluster

### 2.2: Navigate to Search

1. In the left sidebar, click **"Search"**
2. You should see a list of search indexes (may be empty)
3. Click **"Create Search Index"** button

### 2.3: Create the Index

1. Choose **"JSON Editor"** (not the visual editor)
2. Click **"Next"**
3. Select:
   - **Database:** `memoryglass`
   - **Collection:** `video_embeddings`
4. **Index Name:** Type exactly: `vector_index` (must match exactly!)
5. **Paste this JSON** in the editor:

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

6. Click **"Next"**
7. Review the configuration
8. Click **"Create Search Index"**

### 2.4: Wait for Index to Build

- Status will show "Building" initially
- Wait 2-5 minutes
- Status should change to **"Active"** (green checkmark)
- **You cannot use vector search until status is "Active"**

### 2.5: Verify Index

- Go back to Search page
- You should see `vector_index` with status "Active"
- If it shows "Failed" or "Building" for more than 10 minutes, check the error message

---

## ✅ Step 3: Verify Environment Variables

Make sure your `server/.env` file exists and has required variables:

```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/memoryglass?retryWrites=true&w=majority
PORT=3001

# Optional (but recommended)
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

**Check if file exists:**
```bash
cd server
dir .env    # Windows
# or
ls .env     # Mac/Linux
```

If it doesn't exist, create it with the variables above.

---

## ✅ Step 4: Start the Server

### Terminal 1: Backend Server

```bash
cd server
npm run dev
```

**Expected output:**
```
✅ Connected to MongoDB Atlas
✅ Gemini AI initialized
✅ Solana connection initialized
🚀 MemoryGlass API server running on port 3001
```

**If you see errors:**
- **"Cannot find module '@xenova/transformers'"** → Run `npm install` in server directory
- **"MongoDB connection error"** → Check your `MONGODB_URI` in `.env`
- **"GEMINI_API_KEY not set"** → Add it to `server/.env`

### Terminal 2: Frontend (if you want to test the UI)

```bash
npm run dev
```

Frontend should start on http://localhost:8080

---

## ✅ Step 5: Test the System

### Test 1: Health Check

Open browser or use curl:
```bash
curl http://localhost:3001/api/health
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

1. Go to http://localhost:8080/dashboard (or your frontend URL)
2. Click "Upload Video" tab
3. Select a test video file
4. Click "Upload Video"

**Watch the server console for:**
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

**First time:** CLIP model download takes 5-10 minutes (one-time only)

### Test 3: Query the Video

1. Go to "Search Memories" tab
2. Type: "Where did I leave my water bottle?" (or any object in your test video)
3. Click search

**Watch the server console for:**
```
🔢 Generating embeddings for query...
🔍 Vector search executing...
✅ Found X matches
```

**Expected:** Results should appear in 0.1-0.5 seconds (much faster than before!)

---

## ✅ Step 6: Test Live Streaming (Optional)

1. Go to "Live Stream" tab
2. Click "Start Live Stream"
3. Allow camera/microphone access
4. Wait 10-15 seconds (let a few chunks process)
5. Ask a question: "Where did I leave my water bottle?"

**Watch the server console for:**
```
🔢 Vectorized live chunk 1 for session user-1
🔢 Vectorized live chunk 2 for session user-1
...
🔍 Vector search executing...
✅ Found matches from live session
```

---

## 🐛 Troubleshooting

### Issue: "Vector search index not found"

**Solution:**
- Go to MongoDB Atlas → Search
- Verify `vector_index` exists and status is "Active"
- If not active, wait a few more minutes
- If failed, check error message and recreate index

### Issue: "Cannot find module '@xenova/transformers'"

**Solution:**
```bash
cd server
npm install
```

### Issue: "CLIP model download fails"

**Solution:**
- Check internet connection
- First download is ~500MB
- May take 5-10 minutes
- Model is cached after first download

### Issue: "FFmpeg not found"

**Solution:**
- The `ffmpeg-static` package should include FFmpeg
- If issues persist, install FFmpeg system-wide:
  - Windows: Download from https://ffmpeg.org/download.html
  - Mac: `brew install ffmpeg`
  - Linux: `sudo apt-get install ffmpeg`

### Issue: "MongoDB connection error"

**Solution:**
- Check `MONGODB_URI` in `server/.env`
- Verify MongoDB Atlas cluster is running
- Check IP whitelist in MongoDB Atlas (add your IP if needed)
- Verify network access

### Issue: Vector search returns no results

**Solution:**
- Verify embeddings are stored: Check MongoDB Atlas → Browse Collections → `video_embeddings`
- Should see documents with `embedding` arrays (512 numbers each)
- Check that `userId` matches in query and stored embeddings
- Verify index is "Active" (not "Building")

### Issue: Server crashes on video upload

**Solution:**
- Check console for specific error
- Verify all dependencies installed: `npm list` in server directory
- Check disk space (frames are temporarily stored)
- Verify video file is valid (try a different video)

---

## 📋 Quick Checklist

Before running, verify:

- [ ] Dependencies installed (`npm install` in server directory)
- [ ] MongoDB vector search index created and "Active"
- [ ] `server/.env` file exists with required variables
- [ ] Server starts without errors (`npm run dev` in server directory)
- [ ] Health check returns `{"status": "ok"}`

---

## 🎯 What Success Looks Like

### Server Console (Normal Operation):
```
✅ Connected to MongoDB Atlas
✅ Gemini AI initialized
✅ Solana connection initialized
🚀 MemoryGlass API server running on port 3001

[When video uploaded:]
📹 Extracting 60 frames from video (60.0s duration)
✅ Extracted 60 frames
🔄 Loading CLIP model (first time may download ~500MB)...
✅ CLIP model loaded
🔢 Generating embeddings for 60 frames...
✅ Generated 60 embeddings
✅ Stored 60 embeddings for video abc123
✅ Vector processing complete for video abc123

[When query made:]
🔢 Generating embeddings for query...
🔍 Vector search executing...
✅ Found 3 matches
```

### MongoDB Atlas:
- `video_embeddings` collection has documents
- Each document has `embedding` field (array of 512 numbers)
- `vector_index` shows status "Active"

### Frontend:
- Video uploads successfully
- Queries return results quickly (0.1-0.5 seconds)
- Results show confidence scores and timestamps

---

## 🚀 You're Ready!

Once all checkboxes are complete, your vectorized recall system is fully operational!

**Next:** Upload a video and try a query to see the speed improvement!



