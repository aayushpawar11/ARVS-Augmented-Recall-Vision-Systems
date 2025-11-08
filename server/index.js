import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';
import { MongoClient } from 'mongodb';
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
  
  try {
    // Read video file
    const videoData = await fs.readFile(videoPath);
    const base64Video = videoData.toString('base64');
    
    // Analyze video with Gemini Vision
    const prompt = `Analyze this video frame by frame and identify all objects visible. For each object, provide:
    1. Object name/type
    2. Approximate timestamp (if possible)
    3. Location description (relative position in frame)
    4. Confidence level
    
    Return as JSON array with format:
    [{"object": "water bottle", "timestamp": "00:00:15", "location": "center-right, on desk", "confidence": 0.95}, ...]`;

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
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      objects.push(...parsed);
    }

    // Store in MongoDB
    const videoDoc = {
      userId,
      videoPath,
      filename: path.basename(videoPath),
      uploadedAt: new Date(),
      objects: objects.map(obj => ({
        ...obj,
        detectedAt: new Date()
      })),
      processed: true
    };

    await db.collection('videos').insertOne(videoDoc);

    // Send analytics to Snowflake
    await sendToSnowflake({
      event: 'video_processed',
      userId,
      objectCount: objects.length,
      timestamp: new Date()
    });

    return objects;
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

// Query objects using Gemini for natural language understanding
async function queryObjects(userId, query) {
  if (!genAI) {
    throw new Error('Gemini AI not initialized');
  }

  // Get all user's video data
  const videos = await db.collection('videos')
    .find({ userId })
    .sort({ uploadedAt: -1 })
    .limit(100)
    .toArray();

  // Use Gemini to understand the query and search
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  
  const searchPrompt = `User query: "${query}"

Available video data:
${JSON.stringify(videos.map(v => ({
  filename: v.filename,
  uploadedAt: v.uploadedAt,
  objects: v.objects
})), null, 2)}

Analyze the query and find the most relevant object matches. Return JSON with:
{
  "object": "extracted object name",
  "matches": [
    {
      "videoId": "video document id",
      "filename": "video filename",
      "timestamp": "detected timestamp",
      "location": "location description",
      "confidence": 0.95,
      "uploadedAt": "ISO date string"
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
    event: 'object_query',
    userId,
    query,
    objectFound: parsed.matches?.length > 0,
    timestamp: new Date()
  });

  return parsed;
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

// Query for objects
app.post('/api/query', async (req, res) => {
  try {
    const { userId, query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const result = await queryObjects(userId || 'anonymous', query);
    
    // Generate voice response
    const responseText = result.bestMatch 
      ? `I found your ${result.object}. It was last seen ${result.bestMatch.location} at ${new Date(result.bestMatch.uploadedAt).toLocaleTimeString()}.`
      : `I couldn't find ${result.object} in your recent memories.`;

    const voiceAudio = await generateVoiceResponse(responseText);

    res.json({
      ...result,
      responseText,
      voiceAudio: voiceAudio ? `data:audio/mpeg;base64,${voiceAudio}` : null
    });
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's videos
app.get('/api/videos/:userId', async (req, res) => {
  try {
    const videos = await db.collection('videos')
      .find({ userId: req.params.userId })
      .sort({ uploadedAt: -1 })
      .toArray();

    res.json({ videos });
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

