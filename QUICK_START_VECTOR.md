# Quick Start - Vectorized Recall System

## ✅ What I've Done For You

1. ✅ **Updated `server/package.json`** - Added all required dependencies
2. ✅ **Created all utility files** - Frame extraction, embeddings, vector storage
3. ✅ **Modified server code** - Integrated vector search into upload and query endpoints
4. ✅ **Created setup scripts** - `setup-vector-system.bat` (Windows) and `setup-vector-system.sh` (Mac/Linux)

## 🚀 To Complete Setup (2 Steps)

### Step 1: Install Dependencies

**Windows:**
```bash
setup-vector-system.bat
```

**Mac/Linux:**
```bash
chmod +x setup-vector-system.sh
./setup-vector-system.sh
```

**Or manually:**
```bash
cd server
npm install
```

### Step 2: Create MongoDB Vector Search Index

**This MUST be done in MongoDB Atlas UI (cannot be automated):**

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Click on your cluster
3. Click **"Search"** in the left sidebar
4. Click **"Create Search Index"**
5. Choose **"JSON Editor"**
6. Select:
   - **Database:** `memoryglass`
   - **Collection:** `video_embeddings`
   - **Index Name:** `vector_index` (must be exactly this)
7. **Paste this JSON:**

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

8. Click **"Next"** → **"Create Search Index"**
9. Wait 2-5 minutes for index to become **"Active"**

## ✅ That's It!

Once the index is active:

1. **Start your server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Upload a video** through your frontend

3. **Try a query:** "Where did I leave my water bottle?"

## 🎯 What Will Happen

- **First video upload:** Will extract frames, generate embeddings, store in MongoDB
- **First query:** Will use vector search (fast, free, no Gemini API calls)
- **If vector search fails:** Automatically falls back to Gemini (backward compatible)

## 📊 Status Check

**Check if dependencies are installed:**
```bash
cd server
npm list @xenova/transformers fluent-ffmpeg ffmpeg-static
```

**Check if MongoDB index exists:**
- Go to MongoDB Atlas → Search
- Look for `vector_index` with status "Active"

## 🐛 Troubleshooting

**"Cannot find module '@xenova/transformers'"**
→ Run: `cd server && npm install`

**"Vector search index not found"**
→ Create the index in MongoDB Atlas (Step 2 above)

**"FFmpeg not found"**
→ The `ffmpeg-static` package should include it. If issues persist, install FFmpeg system-wide.

**Server starts but queries fail**
→ Check MongoDB index is "Active" (not "Building" or "Failed")

## 💡 Pro Tips

- **First run:** CLIP model downloads ~500MB (one-time, takes 5-10 minutes)
- **Frame extraction:** 1 frame per second (adjustable in code)
- **Processing time:** 30 seconds - 2 minutes per video depending on length
- **Query speed:** Should be 0.1-0.5 seconds (much faster than before!)

---

**Need help?** Check `VECTOR_SETUP_INSTRUCTIONS.md` for detailed troubleshooting.



