import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer configuration for video uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = join(__dirname, 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `video-${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

// Initialize services
let mongoClient;
let db;
let genAI;
let solanaConnection;

// MongoDB Atlas connection
async function connectMongoDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://user:pass@cluster.mongodb.net/memoryglass?retryWrites=true&w=majority';
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    db = mongoClient.db('memoryglass');
    console.log('✅ Connected to MongoDB Atlas');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
  }
}

// Gemini AI initialization
function initGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('⚠️  GEMINI_API_KEY not set');
    return;
  }
  genAI = new GoogleGenerativeAI(apiKey);
  console.log('✅ Gemini AI initialized');
}

// Solana connection
function initSolana() {
  try {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    solanaConnection = new Connection(rpcUrl, 'confirmed');
    console.log('✅ Solana connection initialized');
  } catch (error) {
    console.error('❌ Solana connection error:', error);
  }
}

// Initialize all services
async function initServices() {
  await connectMongoDB();
  initGemini();
  initSolana();
}

// Helper: Extract frames from video and analyze with Gemini
async function processVideoWithGemini(videoPath, userId) {
  if (!genAI) {
    throw new Error('Gemini AI not initialized');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  const objects = [];
  let videoSummary = null;
  
  try {
    // Read video file
    const videoData = await fs.readFile(videoPath);
    const base64Video = videoData.toString('base64');
    
    // Comprehensive video analysis prompt
    const prompt = `Analyze this video comprehensively and provide:
    
    1. OBJECTS: Identify all objects visible with their locations and timestamps
    2. ACTIVITIES: Describe what activities or actions are happening
    3. PEOPLE: Note any people present and their actions
    4. SCENES: Describe different scenes or locations shown
    5. SUMMARY: Provide a brief overall summary of the video content
    
    Return as JSON with format:
    {
      "objects": [{"object": "water bottle", "timestamp": "00:00:15", "location": "center-right, on desk", "confidence": 0.95}, ...],
      "activities": [{"activity": "working at desk", "timestamp": "00:00:00-00:05:00", "description": "person typing on laptop"}],
      "people": [{"description": "person in blue shirt", "actions": ["typing", "drinking water"], "timestamp": "00:00:00"}],
      "scenes": [{"scene": "office desk", "timestamp": "00:00:00", "description": "cluttered desk with laptop and water bottle"}],
      "summary": "Video shows a person working at a desk with various objects including a water bottle, laptop, and papers. The person is typing and occasionally drinks water."
    }`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'video/mp4',
          data: base64Video
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      objects.push(...(parsed.objects || []));
      videoSummary = parsed;
    }

    // Store in MongoDB with optimized data (limit array sizes to prevent bloat)
    const videoDoc = {
      userId,
      videoPath,
      filename: path.basename(videoPath),
      uploadedAt: new Date(),
      // Limit objects to top 50 most confident to prevent storage bloat
      objects: objects
        .map(obj => ({
          object: obj.object,
          timestamp: obj.timestamp,
          location: obj.location,
          confidence: obj.confidence || 0.5
        }))
        .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
        .slice(0, 50),
      // Limit activities to top 20
      activities: (videoSummary?.activities || []).slice(0, 20),
      // Limit people to top 10
      people: (videoSummary?.people || []).slice(0, 10),
      // Limit scenes to top 10
      scenes: (videoSummary?.scenes || []).slice(0, 10),
      // Store summary (text only, should be small)
      summary: (videoSummary?.summary || '').substring(0, 1000), // Max 1000 chars
      processed: true
    };

    await db.collection('videos').insertOne(videoDoc);
    
    // Create indexes to optimize queries and reduce storage overhead (ignore if already exist)
    try {
      await db.collection('videos').createIndex({ userId: 1, uploadedAt: -1 });
      await db.collection('videos').createIndex({ 'objects.object': 'text', summary: 'text' });
    } catch (indexError) {
      // Indexes may already exist, that's fine
      if (!indexError.message.includes('already exists')) {
        console.warn('Index creation warning:', indexError.message);
      }
    }

    // Send analytics to Snowflake
    await sendToSnowflake({
      event: 'video_processed',
      userId,
      objectCount: objects.length,
      activityCount: videoSummary?.activities?.length || 0,
      timestamp: new Date()
    });

    return { objects, summary: videoSummary };
  } catch (error) {
    console.error('Error processing video:', error);
    throw error;
  }
}

// Send analytics to Snowflake
async function sendToSnowflake(data) {
  try {
    const snowflakeUrl = process.env.SNOWFLAKE_API_URL;
    if (!snowflakeUrl) {
      console.warn('⚠️  SNOWFLAKE_API_URL not set, skipping analytics');
      return;
    }

    await axios.post(snowflakeUrl, {
      table: 'memoryglass_analytics',
      data: [data]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.SNOWFLAKE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error sending to Snowflake:', error);
  }
}

// Determine query type: object location vs general question
function detectQueryType(query) {
  const lowerQuery = query.toLowerCase();
  const locationKeywords = ['where', 'left', 'placed', 'put', 'location', 'position'];
  const questionKeywords = ['what', 'who', 'when', 'how', 'why', 'did', 'was', 'were', 'happened', 'doing'];
  
  const hasLocationKeyword = locationKeywords.some(kw => lowerQuery.includes(kw));
  const hasQuestionKeyword = questionKeywords.some(kw => lowerQuery.includes(kw));
  
  // If it's asking "where did I leave X" or "where is X", it's a location query
  if (hasLocationKeyword && (lowerQuery.includes('leave') || lowerQuery.includes('is') || lowerQuery.includes('did'))) {
    return 'location';
  }
  
  // Otherwise, treat as general question
  return 'general';
}

// Query objects using Gemini for natural language understanding
async function queryObjects(userId, query) {
  if (!genAI) {
    throw new Error('Gemini AI not initialized');
  }

  // Get all user's video data (limit to recent 50 to reduce payload size)
  const videos = await db.collection('videos')
    .find({ userId })
    .sort({ uploadedAt: -1 })
    .limit(50)
    .project({
      filename: 1,
      uploadedAt: 1,
      objects: 1,
      activities: 1,
      people: 1,
      scenes: 1,
      summary: 1,
      _id: 1
    })
    .toArray();

  // Use Gemini to understand the query and search
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  
  // Optimize: Only send essential data, limit array sizes in prompt
  const searchPrompt = `User query: "${query}"

Available video data:
${JSON.stringify(videos.map(v => ({
  filename: v.filename,
  uploadedAt: v.uploadedAt,
  objects: (v.objects || []).slice(0, 20), // Limit to top 20 objects per video
  activities: (v.activities || []).slice(0, 10), // Limit to top 10 activities
  people: (v.people || []).slice(0, 5), // Limit to top 5 people
  scenes: (v.scenes || []).slice(0, 5), // Limit to top 5 scenes
  summary: (v.summary || '').substring(0, 500) // Limit summary length
})), null, 2)}

Analyze the query and find the most relevant matches. Return JSON with:
{
  "queryType": "location or general",
  "object": "extracted object name (if location query)",
  "answer": "detailed answer to the question",
  "matches": [
    {
      "videoId": "video document id",
      "filename": "video filename",
      "timestamp": "detected timestamp",
      "location": "location description (if location query)",
      "confidence": 0.95,
      "uploadedAt": "ISO date string",
      "relevantInfo": "relevant information from this video"
    }
  ],
  "bestMatch": { ... most recent/relevant match ... }
}`;

  const result = await model.generateContent(searchPrompt);
  const response = await result.response;
  const text = response.text();
  
  // Parse JSON response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse Gemini response');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  
  // Log query to Snowflake
  await sendToSnowflake({
    event: 'video_query',
    userId,
    query,
    queryType: parsed.queryType || 'general',
    found: parsed.matches?.length > 0,
    timestamp: new Date()
  });

  return parsed;
}

// Answer general questions about video content
async function answerVideoQuestion(userId, query, videoId = null) {
  if (!genAI) {
    throw new Error('Gemini AI not initialized');
  }

  let videos;
  
  if (videoId) {
    // Answer question about specific video
    const video = await db.collection('videos').findOne({ 
      userId, 
      _id: ObjectId.isValid(videoId) ? new ObjectId(videoId) : videoId
    });
    if (!video) {
      throw new Error('Video not found');
    }
    videos = [video];
  } else {
    // Answer question across all videos (limit to recent 10)
    videos = await db.collection('videos')
      .find({ userId })
      .sort({ uploadedAt: -1 })
      .limit(10)
      .project({
        filename: 1,
        uploadedAt: 1,
        objects: 1,
        activities: 1,
        people: 1,
        scenes: 1,
        summary: 1,
        videoPath: 1,
        _id: 1
      })
      .toArray();
  }

  if (videos.length === 0) {
    return {
      answer: "I don't have any videos to analyze yet. Please upload a video first.",
      queryType: 'general',
      matches: []
    };
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  
  // For specific video questions, analyze the actual video
  if (videoId && videos[0].videoPath) {
    try {
      const videoData = await fs.readFile(videos[0].videoPath);
      const base64Video = videoData.toString('base64');
      
      const prompt = `User question: "${query}"

Analyze this video and answer the question in detail. Provide:
1. A clear, comprehensive answer
2. Relevant timestamps where the answer can be found
3. Any important details or context

Answer:`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: 'video/mp4',
            data: base64Video
          }
        }
      ]);

      const response = await result.response;
      const answer = response.text();
      
      return {
        answer,
        queryType: 'general',
        videoId: videoId,
        filename: videos[0].filename,
        matches: [{
          videoId: videoId,
          filename: videos[0].filename,
          relevantInfo: answer,
          uploadedAt: videos[0].uploadedAt
        }]
      };
    } catch (error) {
      console.error('Error analyzing video directly:', error);
      // Fall through to metadata-based answer
    }
  }

  // Use video metadata to answer (limit data size)
  const prompt = `User question: "${query}"

Video information:
${JSON.stringify(videos.map(v => ({
  filename: v.filename,
  uploadedAt: v.uploadedAt,
  summary: (v.summary || '').substring(0, 500),
  objects: (v.objects || []).slice(0, 15), // Limit arrays
  activities: (v.activities || []).slice(0, 8),
  people: (v.people || []).slice(0, 5),
  scenes: (v.scenes || []).slice(0, 5)
})), null, 2)}

Answer the question based on the video information provided. Be specific and reference which video(s) contain the answer. Return JSON:
{
  "answer": "detailed answer to the question",
  "matches": [
    {
      "videoId": "video id",
      "filename": "video filename",
      "relevantInfo": "specific information from this video",
      "timestamp": "relevant timestamp if available",
      "uploadedAt": "ISO date"
    }
  ],
  "bestMatch": { ... most relevant match ... }
}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  // Parse JSON response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      answer: parsed.answer || text,
      queryType: 'general',
      matches: parsed.matches || [],
      bestMatch: parsed.bestMatch
    };
  }

  // Fallback: return text as answer
  return {
    answer: text,
    queryType: 'general',
    matches: videos.map(v => ({
      videoId: v._id.toString(),
      filename: v.filename,
      uploadedAt: v.uploadedAt
    }))
  };
}

// Generate voice response with ElevenLabs
async function generateVoiceResponse(text) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.warn('⚠️  ELEVENLABS_API_KEY not set, returning text only');
      return null;
    }

    const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Default voice
    
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      },
      {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    return Buffer.from(response.data).toString('base64');
  } catch (error) {
    console.error('Error generating voice response:', error);
    return null;
  }
}

// Solana: Mint NFT for memorable moments
async function mintMemoryNFT(userId, memoryData) {
  try {
    if (!solanaConnection) {
      throw new Error('Solana not initialized');
    }

    // This is a simplified version - in production, you'd use a proper NFT minting program
    const wallet = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(process.env.SOLANA_WALLET_SECRET || '[]'))
    );

    // Create transaction (simplified - actual NFT minting requires SPL Token program)
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: new PublicKey(process.env.SOLANA_TREASURY || wallet.publicKey),
        lamports: 0.001 * LAMPORTS_PER_SOL
      })
    );

    // Store NFT metadata in MongoDB
    await db.collection('nfts').insertOne({
      userId,
      memoryData,
      mintedAt: new Date(),
      transactionHash: 'pending',
      solanaAddress: wallet.publicKey.toString()
    });

    return { success: true, address: wallet.publicKey.toString() };
  } catch (error) {
    console.error('Error minting NFT:', error);
    throw error;
  }
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    services: {
      mongodb: !!db,
      gemini: !!genAI,
      solana: !!solanaConnection
    }
  });
});

// Upload video
app.post('/api/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const userId = req.body.userId || 'anonymous';
    const videoPath = req.file.path;

    // Process video asynchronously
    processVideoWithGemini(videoPath, userId)
      .then(() => console.log(`✅ Processed video: ${req.file.filename}`))
      .catch(err => console.error('❌ Error processing video:', err));

    res.json({
      success: true,
      videoId: req.file.filename,
      message: 'Video uploaded and processing started'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Query for objects or answer questions
app.post('/api/query', async (req, res) => {
  try {
    const { userId, query, videoId } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const queryType = detectQueryType(query);
    let result;

    if (queryType === 'location') {
      // Object location query
      result = await queryObjects(userId || 'anonymous', query);
      
      // Generate voice response for location queries
      const responseText = result.bestMatch 
        ? `I found your ${result.object || 'item'}. It was last seen ${result.bestMatch.location} at ${new Date(result.bestMatch.uploadedAt).toLocaleTimeString()}.`
        : `I couldn't find ${result.object || 'that item'} in your recent memories.`;
      
      result.responseText = responseText;
    } else {
      // General question about video content
      result = await answerVideoQuestion(userId || 'anonymous', query, videoId);
      
      // Generate voice response for general questions
      result.responseText = result.answer || 'I couldn\'t find an answer to that question in your videos.';
    }

    // Generate voice audio
    const voiceAudio = await generateVoiceResponse(result.responseText);

    res.json({
      ...result,
      queryType: result.queryType || queryType,
      voiceAudio: voiceAudio ? `data:audio/mpeg;base64,${voiceAudio}` : null
    });
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's videos (optimized - only return essential fields)
app.get('/api/videos/:userId', async (req, res) => {
  try {
    const videos = await db.collection('videos')
      .find({ userId: req.params.userId })
      .sort({ uploadedAt: -1 })
      .project({
        filename: 1,
        uploadedAt: 1,
        summary: 1,
        processed: 1
      })
      .toArray();

    // Add counts client-side to avoid aggregation complexity
    const videosWithCounts = videos.map(v => ({
      ...v,
      objectCount: 0, // Will be calculated if needed
      activityCount: 0
    }));

    res.json({ videos: videosWithCounts });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mint memory NFT
app.post('/api/mint-nft', async (req, res) => {
  try {
    const { userId, memoryData } = req.body;
    const result = await mintMemoryNFT(userId, memoryData);
    res.json(result);
  } catch (error) {
    console.error('NFT minting error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
initServices().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 MemoryGlass API server running on port ${PORT}`);
  });
});

export default app;

