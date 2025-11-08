# Vectorized Recall System — Implementation Plan

## Overview

Transform the current recall system from sending all video metadata to Gemini on every query to a vectorized approach where videos are analyzed once, embeddings are stored in MongoDB, and queries use fast semantic search. This reduces costs, improves speed, and scales better.

---

## Architecture Overview

**Current System:**
- Every query → Fetch all video metadata → Send to Gemini → Parse results

**New System:**
- Video upload → Extract frames → Generate embeddings → Store in MongoDB Vector Search
- Query → Embed query text → Vector similarity search → Return matches
- Gemini only used for complex reasoning when needed

---

## 1. Technology Stack (All Free/Open Source)

### Embedding Models (Choose One)

**Option 1: CLIP (Recommended)**
- Library: `@xenova/transformers` (runs in Node.js, no API needed)
- Model: `Xenova/clip-vit-base-patch32`
- Pros: Free, runs locally, good for visual-text matching
- Cons: Requires model download (~500MB first time)

**Option 2: Sentence Transformers via ONNX**
- Library: `onnxruntime-node` + `@xenova/transformers`
- Model: `Xenova/all-MiniLM-L6-v2` (for text) or vision models
- Pros: Fast, lightweight, good text embeddings
- Cons: Separate models for text vs vision

**Option 3: Google Gemini Embeddings (Free Tier)**
- API: `@google/generative-ai` (embedding-001 model)
- Pros: High quality, no local model needed
- Cons: Requires API calls (but free tier is generous)

**Recommendation:** Start with CLIP via `@xenova/transformers` for visual-text matching, or Gemini embeddings if you want to avoid local models.

### Vector Database

**MongoDB Atlas Vector Search** (Recommended - you already use MongoDB)
- Free tier: 512MB storage
- Built-in vector search with `$vectorSearch` operator
- No additional service needed
- Index type: `vectorSearch` on embedding field

### Frame Extraction

**Library: `ffmpeg-static` or `fluent-ffmpeg`**
- Extract frames at intervals (every 0.5-1 second)
- Or extract on scene changes (motion detection)
- Free, open source

---

## 2. Database Schema Changes

### Current Schema (Keep for compatibility)
```javascript
{
  userId: String,
  videoId: ObjectId,
  filename: String,
  uploadedAt: Date,
  processed: Boolean,
  objects: Array,  // Keep for backward compatibility
  activities: Array,
  summary: String,
  // ... existing fields
}
```

### New Schema: Vector Embeddings Collection

Create a new collection: `video_embeddings`

```javascript
{
  _id: ObjectId,
  userId: String,
  videoId: ObjectId,  // Reference to videos collection
  timestamp: Number,  // Frame timestamp in seconds (e.g., 15.5)
  frameNumber: Number,  // Sequential frame number
  caption: String,  // Optional: text description of frame
  objects: Array<String>,  // Detected objects in this frame
  embedding: Array<Number>,  // Vector embedding (e.g., 512 dimensions)
  metadata: {
    scene: String,  // Optional scene description
    activity: String,  // Optional activity
    location: String  // Optional location hint
  }
}
```

### MongoDB Vector Search Index

Create a vector search index on the `video_embeddings` collection:

```javascript
{
  "name": "vector_index",
  "type": "vectorSearch",
  "definition": {
    "fields": [
      {
        "type": "vector",
        "path": "embedding",
        "numDimensions": 512,  // Match your embedding model dimensions
        "similarity": "cosine"
      }
    ]
  }
}
```

Also create regular indexes:
- `{ userId: 1, videoId: 1 }` - For user-specific queries
- `{ timestamp: 1 }` - For time-based filtering

---

## 3. Video Processing Pipeline

### Step 1: Frame Extraction

When a video is uploaded, extract frames at regular intervals:

```javascript
// Pseudocode
async function extractFrames(videoPath) {
  // Extract 1 frame per second (or every 0.5 seconds)
  // Use ffmpeg: ffmpeg -i video.mp4 -vf fps=1 frames/frame_%04d.jpg
  
  const frames = [];
  const frameInterval = 1.0; // seconds
  const videoDuration = await getVideoDuration(videoPath);
  
  for (let time = 0; time < videoDuration; time += frameInterval) {
    const framePath = await extractFrameAtTime(videoPath, time);
    frames.push({
      path: framePath,
      timestamp: time,
      frameNumber: Math.floor(time / frameInterval)
    });
  }
  
  return frames;
}
```

### Step 2: Generate Embeddings

For each extracted frame, generate an embedding:

**Using CLIP (Recommended):**
```javascript
// Install: npm install @xenova/transformers
const { pipeline } = require('@xenova/transformers');

async function generateEmbeddings(frames) {
  // Load CLIP model (first time downloads ~500MB)
  const clip = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32');
  
  const embeddings = [];
  for (const frame of frames) {
    // Generate embedding for image
    const embedding = await clip(frame.path);
    embeddings.push({
      frame,
      embedding: embedding.data,  // Array of numbers
      dimensions: embedding.data.length  // Usually 512
    });
  }
  
  return embeddings;
}
```

**Using Gemini Embeddings (Alternative):**
```javascript
async function generateEmbeddingsWithGemini(frames) {
  const model = genAI.getGenerativeModel({ model: 'embedding-001' });
  
  const embeddings = [];
  for (const frame of frames) {
    // Read frame image
    const imageData = await fs.readFile(frame.path);
    const base64Image = imageData.toString('base64');
    
    // Generate embedding
    const result = await model.embedContent({
      content: {
        parts: [{
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image
          }
        }]
      }
    });
    
    embeddings.push({
      frame,
      embedding: result.embedding.values,  // Array of numbers
      dimensions: result.embedding.values.length  // Usually 768
    });
  }
  
  return embeddings;
}
```

### Step 3: Optional Caption Generation

For better searchability, generate text captions for frames:

**Option A: Use Gemini Vision (when needed)**
- Only caption frames that have high object confidence
- Batch process to save API calls

**Option B: Use CLIP's text encoder**
- Generate captions using CLIP's text understanding
- Less detailed but faster

**Option C: Skip captions initially**
- Rely on embeddings alone
- Add captions later if needed

### Step 4: Store in MongoDB

Store each frame's embedding in the `video_embeddings` collection:

```javascript
async function storeEmbeddings(videoId, userId, embeddings, captions) {
  const documents = embeddings.map((emb, index) => ({
    userId,
    videoId: new ObjectId(videoId),
    timestamp: emb.frame.timestamp,
    frameNumber: emb.frame.frameNumber,
    caption: captions[index] || '',
    objects: [],  // Can be populated from Gemini analysis
    embedding: emb.embedding,  // Array of numbers
    metadata: {
      scene: '',
      activity: '',
      location: ''
    }
  }));
  
  // Batch insert for efficiency
  await db.collection('video_embeddings').insertMany(documents);
  
  console.log(`✅ Stored ${documents.length} embeddings for video ${videoId}`);
}
```

---

## 4. Query Processing (Vector Search)

### Step 1: Embed User Query

Convert the user's text query into an embedding using the same model:

**Using CLIP:**
```javascript
async function embedQuery(queryText) {
  const clip = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32');
  
  // CLIP can embed text directly
  const textEmbedding = await clip(queryText, { task: 'text' });
  return textEmbedding.data;
}
```

**Using Gemini Embeddings:**
```javascript
async function embedQueryWithGemini(queryText) {
  const model = genAI.getGenerativeModel({ model: 'embedding-001' });
  const result = await model.embedContent(queryText);
  return result.embedding.values;
}
```

### Step 2: Vector Similarity Search

Use MongoDB's `$vectorSearch` operator to find similar embeddings:

```javascript
async function searchVectors(userId, queryEmbedding, limit = 5) {
  const results = await db.collection('video_embeddings')
    .aggregate([
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: 100,  // Number of candidates to consider
          limit: limit
        }
      },
      {
        $match: {
          userId: userId  // Filter by user
        }
      },
      {
        $lookup: {
          from: 'videos',
          localField: 'videoId',
          foreignField: '_id',
          as: 'video'
        }
      },
      {
        $unwind: '$video'
      },
      {
        $project: {
          _id: 1,
          videoId: 1,
          timestamp: 1,
          frameNumber: 1,
          caption: 1,
          objects: 1,
          metadata: 1,
          filename: '$video.filename',
          uploadedAt: '$video.uploadedAt',
          score: { $meta: 'vectorSearchScore' }  // Similarity score
        }
      },
      {
        $sort: { score: -1 }  // Sort by similarity
      }
    ])
    .toArray();
  
  return results;
}
```

### Step 3: Format Results

Convert vector search results into the same format your frontend expects:

```javascript
async function processVectorQuery(userId, query) {
  // 1. Embed the query
  const queryEmbedding = await embedQuery(query);
  
  // 2. Search vectors
  const matches = await searchVectors(userId, queryEmbedding, 10);
  
  // 3. Format results (compatible with existing frontend)
  const formattedResults = {
    queryType: 'location',  // Or detect from query
    object: extractObjectName(query),  // Simple extraction
    matches: matches.map(match => ({
      videoId: match.videoId.toString(),
      filename: match.filename,
      timestamp: formatTimestamp(match.timestamp),
      location: match.metadata.location || match.caption,
      confidence: match.score,  // Vector similarity score (0-1)
      uploadedAt: match.uploadedAt,
      relevantInfo: match.caption,
      frameNumber: match.frameNumber
    })),
    bestMatch: matches[0] ? {
      videoId: matches[0].videoId.toString(),
      filename: matches[0].filename,
      timestamp: formatTimestamp(matches[0].timestamp),
      location: matches[0].metadata.location || matches[0].caption,
      confidence: matches[0].score,
      uploadedAt: matches[0].uploadedAt
    } : null
  };
  
  return formattedResults;
}
```

---

## 5. Modified API Endpoint

Update the `/api/query` endpoint to use vector search:

```javascript
app.post('/api/query', async (req, res) => {
  try {
    const { userId, query, videoId } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // NEW: Use vector search instead of sending all metadata to Gemini
    const result = await processVectorQuery(userId || 'anonymous', query);
    
    // Generate human-readable response
    const responseText = result.bestMatch
      ? `I found your ${result.object || 'item'}. It was last seen ${result.bestMatch.location} at ${formatTime(result.bestMatch.uploadedAt)}.`
      : `I couldn't find ${result.object || 'that item'} in your recent memories.`;
    
    result.responseText = responseText;
    
    // Generate voice response (same as before)
    const voiceAudio = await generateVoiceResponse(result.responseText);
    
    res.json({
      ...result,
      voiceAudio: voiceAudio ? `data:audio/mpeg;base64,${voiceAudio}` : null
    });
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## 6. Video Upload Modification

Update the upload endpoint to extract frames and generate embeddings:

```javascript
app.post('/api/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }
    
    const userId = req.body.userId || 'anonymous';
    const videoPath = req.file.path;
    
    // Create initial video document
    const initialVideoDoc = {
      userId,
      videoPath,
      filename: path.basename(videoPath),
      uploadedAt: new Date(),
      processed: false
    };
    
    const insertResult = await db.collection('videos').insertOne(initialVideoDoc);
    const videoId = insertResult.insertedId.toString();
    
    // NEW: Process video asynchronously - extract frames and generate embeddings
    processVideoWithVectors(videoPath, userId, videoId)
      .then(async () => {
        await db.collection('videos').updateOne(
          { _id: insertResult.insertedId },
          { $set: { processed: true } }
        );
        console.log(`✅ Processed and vectorized video: ${req.file.filename}`);
      })
      .catch(async (err) => {
        console.error('❌ Error processing video:', err);
        await db.collection('videos').updateOne(
          { _id: insertResult.insertedId },
          { $set: { processed: false, error: err.message } }
        );
      });
    
    res.json({
      success: true,
      videoId: videoId,
      filename: req.file.filename,
      message: 'Video uploaded and processing started'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function processVideoWithVectors(videoPath, userId, videoId) {
  // 1. Extract frames
  const frames = await extractFrames(videoPath);
  console.log(`📹 Extracted ${frames.length} frames`);
  
  // 2. Generate embeddings
  const embeddings = await generateEmbeddings(frames);
  console.log(`🔢 Generated ${embeddings.length} embeddings`);
  
  // 3. Optional: Generate captions (can be done in batches)
  // const captions = await generateCaptions(frames);
  
  // 4. Store embeddings in MongoDB
  await storeEmbeddings(videoId, userId, embeddings, []);
  
  // 5. Optional: Still run Gemini analysis for objects/activities (for backward compatibility)
  // This can run in parallel or be skipped
  const geminiData = await processVideoWithGemini(videoPath, userId);
  await db.collection('videos').updateOne(
    { _id: new ObjectId(videoId) },
    { $set: geminiData }
  );
}
```

---

## 7. Optional: Hybrid Approach (Vector + Gemini Reasoning)

For complex queries that need reasoning, use vector search first, then Gemini:

```javascript
async function hybridQuery(userId, query) {
  // 1. Vector search for fast recall
  const vectorResults = await processVectorQuery(userId, query);
  
  // 2. If query needs reasoning (e.g., "solve the math problem I saw")
  if (needsReasoning(query)) {
    // Get the top matching frame
    const topMatch = vectorResults.matches[0];
    const framePath = await getFramePath(topMatch.videoId, topMatch.frameNumber);
    
    // Send only this frame to Gemini for reasoning
    const reasoningResult = await geminiReasoning(query, framePath);
    
    return {
      ...vectorResults,
      reasoning: reasoningResult,
      responseText: reasoningResult.answer
    };
  }
  
  // 3. Otherwise, return vector results
  return vectorResults;
}

function needsReasoning(query) {
  const reasoningKeywords = ['solve', 'calculate', 'explain', 'analyze', 'what does this mean'];
  return reasoningKeywords.some(keyword => query.toLowerCase().includes(keyword));
}
```

---

## 8. Implementation Steps

### Phase 1: Setup (Day 1)

1. **Install dependencies:**
   ```bash
   npm install @xenova/transformers fluent-ffmpeg ffmpeg-static
   # OR if using Gemini embeddings:
   # (already have @google/generative-ai)
   ```

2. **Create MongoDB Vector Search index:**
   - Go to MongoDB Atlas → Your cluster → Search → Create Search Index
   - Choose JSON Editor
   - Create index on `video_embeddings` collection
   - Use the index definition from section 2

3. **Test embedding generation:**
   - Create a test script to generate embeddings for a sample image
   - Verify the embedding dimensions match your index

### Phase 2: Frame Extraction (Day 2)

1. **Implement frame extraction:**
   - Add `extractFrames()` function
   - Test with a sample video
   - Verify frames are extracted correctly

2. **Store frames temporarily:**
   - Save frames to `server/frames/` directory
   - Clean up after processing

### Phase 3: Embedding Generation (Day 3)

1. **Implement embedding generation:**
   - Choose CLIP or Gemini embeddings
   - Test with sample frames
   - Verify embedding dimensions

2. **Batch processing:**
   - Process frames in batches to avoid memory issues
   - Add progress logging

### Phase 4: Storage (Day 4)

1. **Create `video_embeddings` collection:**
   - Set up schema
   - Create indexes

2. **Implement `storeEmbeddings()`:**
   - Test with sample embeddings
   - Verify data is stored correctly

3. **Update video upload endpoint:**
   - Integrate frame extraction and embedding generation
   - Test end-to-end with a video upload

### Phase 5: Query Processing (Day 5)

1. **Implement query embedding:**
   - Test query embedding generation
   - Verify it matches frame embedding dimensions

2. **Implement vector search:**
   - Test `$vectorSearch` queries
   - Verify results are relevant

3. **Update `/api/query` endpoint:**
   - Replace Gemini-based search with vector search
   - Test with various queries

### Phase 6: Testing & Optimization (Day 6-7)

1. **Test with real videos:**
   - Upload multiple videos
   - Test various queries
   - Compare results with old system

2. **Optimize:**
   - Adjust frame extraction interval
   - Fine-tune similarity thresholds
   - Add caching if needed

3. **Backward compatibility:**
   - Keep old metadata fields for compatibility
   - Gradually migrate

---

## 9. Cost Comparison

### Current System (Per Query)
- Gemini API: ~$0.001-0.003 per query (depends on metadata size)
- For 100 queries/day: ~$0.10-0.30/day = ~$3-9/month

### New System (One-Time Processing + Queries)
- Video Processing (one-time per video):
  - CLIP: Free (runs locally)
  - OR Gemini Embeddings: ~$0.0001 per frame (if using Gemini)
  - For 10 videos/day with 60 frames each: ~$0.06/day = ~$1.80/month
  
- Query Processing:
  - Vector Search: Free (MongoDB Atlas free tier)
  - For 100 queries/day: $0/day
  
- **Total: ~$1.80/month vs $3-9/month** (60-80% cost reduction)

---

## 10. Performance Benefits

| Metric | Current (Gemini) | New (Vector) | Improvement |
|--------|------------------|-------------|-------------|
| Query Time | 2-5 seconds | 0.1-0.5 seconds | 10x faster |
| API Calls | 1 per query | 0 per query | 100% reduction |
| Scalability | Limited by Gemini rate limits | Limited by MongoDB | Much better |
| Offline Capability | No | Yes (with CLIP) | New capability |

---

## 11. Migration Strategy

### Option 1: Gradual Migration
- Keep both systems running
- New videos use vector system
- Old videos still use metadata search
- Gradually migrate old videos

### Option 2: Full Migration
- Process all existing videos to generate embeddings
- Switch query endpoint to vector search
- Keep metadata for backward compatibility

### Option 3: Hybrid (Recommended)
- Use vector search for location queries
- Use Gemini for complex reasoning queries
- Best of both worlds

---

## 12. Troubleshooting

### Issue: Embeddings don't match query embeddings
- **Solution:** Ensure same model is used for frames and queries
- Check embedding dimensions match

### Issue: Vector search returns irrelevant results
- **Solution:** 
  - Adjust `numCandidates` in `$vectorSearch`
  - Try different embedding models
  - Add filters (userId, date range)

### Issue: Frame extraction is slow
- **Solution:**
  - Reduce frame extraction rate (every 2 seconds instead of 1)
  - Use scene change detection instead of fixed intervals
  - Process in background/async

### Issue: MongoDB Vector Search not working
- **Solution:**
  - Verify index is created and active
  - Check embedding dimensions match index definition
  - Ensure you're using MongoDB Atlas (not local MongoDB)

---

## 13. Next Steps

1. **Choose embedding model:** CLIP (free, local) or Gemini (API-based)
2. **Set up MongoDB Vector Search index**
3. **Implement frame extraction**
4. **Test with one video end-to-end**
5. **Update query endpoint**
6. **Test and iterate**

This transformation will make your recall system faster, cheaper, and more scalable while maintaining the same user experience.



