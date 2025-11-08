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
    
    // Debug: Log connection attempt (without exposing full URI)
    const uriParts = mongoUri.split('@');
    const displayUri = uriParts.length > 1 
      ? `mongodb+srv://***@${uriParts[1]}` 
      : 'mongodb+srv://***';
    console.log(`🔌 Attempting MongoDB connection to: ${displayUri}`);
    console.log(`📋 Database name: memoryglass`);
    
    if (!mongoUri || mongoUri.includes('user:pass') || mongoUri.includes('***')) {
      console.warn('⚠️  Warning: Using default/placeholder MongoDB URI. Set MONGODB_URI in .env file.');
    }
    
    // MongoDB connection options
    // Note: mongodb+srv:// automatically uses TLS, so we don't need to set tls: true
    const mongoOptions = {
      serverSelectionTimeoutMS: 15000, // 15 second timeout
      connectTimeoutMS: 15000,
      // Let MongoDB driver handle TLS automatically for mongodb+srv://
    };
    
    mongoClient = new MongoClient(mongoUri, mongoOptions);
    
    console.log('⏳ Connecting to MongoDB...');
    await mongoClient.connect();
    
    // Test the connection
    await mongoClient.db('admin').command({ ping: 1 });
    console.log('✅ MongoDB ping successful');
    
    db = mongoClient.db('memoryglass');
    
    // Verify database access
    const collections = await db.listCollections().toArray();
    console.log(`✅ Connected to MongoDB Atlas`);
    console.log(`📊 Database: memoryglass`);
    console.log(`📁 Collections found: ${collections.length}`);
    if (collections.length > 0) {
      console.log(`   - ${collections.map(c => c.name).join(', ')}`);
    }
  } catch (error) {
    console.error('❌ MongoDB connection error:');
    console.error(`   Error name: ${error.name}`);
    console.error(`   Error message: ${error.message}`);
    
    if (error.message.includes('authentication failed')) {
      console.error('   🔐 Issue: Authentication failed. Check username/password in MONGODB_URI');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('   🌐 Issue: DNS resolution failed. Check cluster hostname in MONGODB_URI');
    } else if (error.message.includes('timeout')) {
      console.error('   ⏱️  Issue: Connection timeout. Check network/firewall settings');
      console.error('   💡 Tip: Ensure your IP is whitelisted in MongoDB Atlas Network Access');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('   🚫 Issue: Connection refused. Check MongoDB Atlas cluster status');
    } else if (error.message.includes('SSL') || error.message.includes('TLS') || error.message.includes('tlsv1')) {
      console.error('   🔒 Issue: SSL/TLS connection error');
      console.error('   💡 Possible causes:');
      console.error('      - Node.js version compatibility issue (try Node.js 18+)');
      console.error('      - OpenSSL version mismatch');
      console.error('      - Network/firewall blocking SSL handshake');
      console.error('      - MongoDB Atlas cluster SSL configuration');
      console.error('   🔧 Try: Update Node.js or check MongoDB Atlas connection string');
    }
    
    console.error(`   Full error: ${error.stack || error}`);
    console.error('');
    console.error('💡 Troubleshooting steps:');
    console.error('   1. Verify MONGODB_URI in server/.env file');
    console.error('   2. Check MongoDB Atlas cluster is running');
    console.error('   3. Ensure your IP is whitelisted in MongoDB Atlas Network Access');
    console.error('   4. Verify database user credentials are correct');
    console.error('   5. Check MongoDB Atlas connection string format');
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

// Helper: Extract and transcribe audio from video, detect questions
async function extractQuestionsFromVideo(videoPath) {
  if (!genAI) {
    return { questions: [], transcript: '' };
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const videoData = await fs.readFile(videoPath);
    const base64Video = videoData.toString('base64');

    // Extract audio transcript and detect questions
    const prompt = `Analyze the audio in this video and:
    
    1. TRANSCRIBE: Provide a full transcript of all spoken words with timestamps
    2. DETECT QUESTIONS: Identify any questions asked in the video. A question is any sentence that:
       - Ends with a question mark (?)
       - Starts with question words (what, where, when, who, why, how, did, do, does, is, are, was, were, can, could, should, would)
       - Has an interrogative tone
    
    Return as JSON:
    {
      "transcript": "Full transcript of all spoken words",
      "questions": [
        {
          "question": "What was I doing?",
          "timestamp": "00:00:15",
          "confidence": 0.95
        }
      ]
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
      return {
        questions: parsed.questions || [],
        transcript: parsed.transcript || text
      };
    }

    return { questions: [], transcript: text };
  } catch (error) {
    console.error('Error extracting questions from video:', error);
    return { questions: [], transcript: '' };
  }
}

// Helper: Automatically answer questions detected in video
async function answerVideoQuestions(videoPath, questions, videoMetadata) {
  if (!genAI || questions.length === 0) {
    return [];
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const videoData = await fs.readFile(videoPath);
    const base64Video = videoData.toString('base64');

    const answeredQuestions = [];

    // Answer each question by analyzing the video
    for (const question of questions) {
      try {
        const prompt = `The user asked this question while recording the video: "${question.question}"

Analyze the video and provide a clear, detailed answer to this question. Consider:
- What is visible in the video at the time the question was asked (timestamp: ${question.timestamp})
- The context of what was happening
- Any relevant objects, people, or activities shown

Provide a comprehensive answer:`;

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

        answeredQuestions.push({
          question: question.question,
          answer: answer,
          timestamp: question.timestamp,
          confidence: question.confidence || 0.8,
          answeredAt: new Date()
        });
      } catch (error) {
        console.error(`Error answering question "${question.question}":`, error);
        // Still store the question even if answer failed
        answeredQuestions.push({
          question: question.question,
          answer: 'Unable to generate answer at this time.',
          timestamp: question.timestamp,
          confidence: question.confidence || 0.5,
          answeredAt: new Date()
        });
      }
    }

    return answeredQuestions;
  } catch (error) {
    console.error('Error answering video questions:', error);
    return questions.map(q => ({
      question: q.question,
      answer: 'Unable to generate answer.',
      timestamp: q.timestamp,
      confidence: q.confidence || 0.5,
      answeredAt: new Date()
    }));
  }
}

// Helper: Extract frames from video and analyze with Gemini
async function processVideoWithGemini(videoPath, userId) {
  if (!genAI) {
    throw new Error('Gemini AI not initialized');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  const objects = [];
  let videoSummary = null;
  let questionsAndAnswers = [];
  
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

    // Extract questions from video audio
    console.log('🎤 Extracting questions from video audio...');
    const { questions, transcript } = await extractQuestionsFromVideo(videoPath);
    
    if (questions.length > 0) {
      console.log(`❓ Found ${questions.length} question(s) in video`);
      // Automatically answer the questions
      questionsAndAnswers = await answerVideoQuestions(videoPath, questions, {
        objects,
        summary: videoSummary
      });
      console.log(`✅ Answered ${questionsAndAnswers.length} question(s)`);
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
      // Store questions asked in video and their answers
      questions: questionsAndAnswers.slice(0, 10), // Limit to top 10 questions
      transcript: transcript.substring(0, 2000), // Store transcript (max 2000 chars)
      processed: true
    };

    // Note: Video document is created in upload endpoint, we just return the data
    // The upload endpoint will update it with this processed data
    
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
      questionCount: questionsAndAnswers.length,
      timestamp: new Date()
    });

    // Return the video document data for the upload endpoint to update
    return {
      objects: videoDoc.objects,
      activities: videoDoc.activities,
      people: videoDoc.people,
      scenes: videoDoc.scenes,
      summary: videoDoc.summary,
      questions: videoDoc.questions,
      transcript: videoDoc.transcript
    };
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

// Debug endpoint for MongoDB connection details
app.get('/api/debug/mongodb', async (req, res) => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'not set';
    const uriParts = mongoUri.split('@');
    const displayUri = uriParts.length > 1 
      ? `mongodb+srv://***@${uriParts[1]}` 
      : 'mongodb+srv://***';
    
    const debugInfo = {
      connected: !!db,
      uriConfigured: !!process.env.MONGODB_URI,
      uriDisplay: displayUri,
      databaseName: 'memoryglass',
      hasMongoClient: !!mongoClient,
    };
    
    if (db) {
      try {
        // Test connection
        await mongoClient.db('admin').command({ ping: 1 });
        debugInfo.ping = 'success';
        
        // Get collections
        const collections = await db.listCollections().toArray();
        debugInfo.collections = collections.map(c => c.name);
        debugInfo.collectionCount = collections.length;
        
        // Get database stats
        const stats = await db.stats();
        debugInfo.stats = {
          collections: stats.collections,
          dataSize: stats.dataSize,
          storageSize: stats.storageSize
        };
      } catch (testError) {
        debugInfo.ping = 'failed';
        debugInfo.pingError = testError.message;
      }
    } else {
      debugInfo.error = 'Database not connected';
      debugInfo.troubleshooting = [
        'Check server logs for connection errors',
        'Verify MONGODB_URI in server/.env file',
        'Ensure MongoDB Atlas cluster is running',
        'Check IP whitelist in MongoDB Atlas Network Access',
        'Verify database user credentials'
      ];
    }
    
    res.json(debugInfo);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

// Upload video
app.post('/api/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const userId = req.body.userId || 'anonymous';
    const videoPath = req.file.path;

    // Create initial video document to get MongoDB ID
    const initialVideoDoc = {
      userId,
      videoPath,
      filename: path.basename(videoPath),
      uploadedAt: new Date(),
      processed: false,
      objects: [],
      activities: [],
      people: [],
      scenes: [],
      summary: '',
      questions: [],
      transcript: ''
    };

    const insertResult = await db.collection('videos').insertOne(initialVideoDoc);
    const videoId = insertResult.insertedId.toString();

    // Process video asynchronously and update the document
    processVideoWithGemini(videoPath, userId)
      .then(async (videoDoc) => {
        // Update the video document with processed data
        await db.collection('videos').updateOne(
          { _id: insertResult.insertedId },
          {
            $set: {
              objects: videoDoc.objects || [],
              activities: videoDoc.activities || [],
              people: videoDoc.people || [],
              scenes: videoDoc.scenes || [],
              summary: videoDoc.summary || '',
              questions: videoDoc.questions || [],
              transcript: videoDoc.transcript || '',
              processed: true
            }
          }
        );
        console.log(`✅ Processed video: ${req.file.filename}`);
      })
      .catch(async (err) => {
        console.error('❌ Error processing video:', err);
        // Mark as failed
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
        processed: 1,
        questions: 1 // Include questions
      })
      .toArray();

    // Add counts client-side to avoid aggregation complexity
    const videosWithCounts = videos.map(v => ({
      ...v,
      objectCount: 0, // Will be calculated if needed
      activityCount: 0,
      questionCount: (v.questions || []).length
    }));

    res.json({ videos: videosWithCounts });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get video details including questions and answers
app.get('/api/video/:videoId/questions', async (req, res) => {
  try {
    const video = await db.collection('videos').findOne({
      _id: ObjectId.isValid(req.params.videoId) ? new ObjectId(req.params.videoId) : req.params.videoId
    }, {
      projection: {
        questions: 1,
        transcript: 1,
        filename: 1
      }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({
      questions: video.questions || [],
      transcript: video.transcript || '',
      filename: video.filename
    });
  } catch (error) {
    console.error('Error fetching video questions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rate limiting for live answers (prevent API spam)
const liveAnswerCache = new Map();
const RATE_LIMIT_WINDOW = 5000; // 5 seconds
const MAX_QUESTIONS_PER_WINDOW = 3;

// Live stream session memory - stores video chunk metadata during active streams
const liveStreamSessions = new Map(); // userId -> session data

// Clean up old sessions (older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [userId, session] of liveStreamSessions.entries()) {
    if (session.lastActivity < oneHourAgo) {
      liveStreamSessions.delete(userId);
      console.log(`🧹 Cleaned up old session for user: ${userId}`);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

// Initialize or get live stream session
function getLiveStreamSession(userId) {
  if (!liveStreamSessions.has(userId)) {
    liveStreamSessions.set(userId, {
      userId,
      startedAt: Date.now(),
      lastActivity: Date.now(),
      chunks: [], // Video chunks with metadata
      objects: [], // All detected objects with timestamps
      activities: [], // Activities with timestamps
      scenes: [] // Scene changes
    });
  }
  const session = liveStreamSessions.get(userId);
  session.lastActivity = Date.now();
  return session;
}

// Analyze video chunk and extract objects/activities (lightweight analysis)
// Only analyzes every Nth chunk to save API costs (configurable)
const CHUNK_ANALYSIS_INTERVAL = 2; // Analyze every 2nd chunk (~6 seconds of video)

async function analyzeVideoChunkForMemory(videoPath, session) {
  if (!genAI) return;

  // Skip analysis if we've analyzed too recently (throttle to save API costs)
  const lastAnalysis = session.lastChunkAnalysis || 0;
  const timeSinceLastAnalysis = Date.now() - lastAnalysis;
  const minInterval = 6000; // Analyze at most every 6 seconds

  if (timeSinceLastAnalysis < minInterval && session.chunks.length > 0) {
    // Just store chunk metadata without analysis
    const timestamp = Date.now();
    const relativeTime = Math.floor((timestamp - session.startedAt) / 1000);
    session.chunks.push({
      timestamp,
      relativeTime,
      objects: [],
      activity: 'Not analyzed (throttled)'
    });
    return;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const videoData = await fs.readFile(videoPath);
    const base64Video = videoData.toString('base64');

    // Lightweight analysis - just extract objects and key activities
    const prompt = `Analyze this short video segment (3 seconds) and extract ONLY:
    
1. OBJECTS: List visible objects with locations (max 10 most prominent)
2. KEY_ACTIVITY: One sentence describing what's happening

Return JSON:
{
  "objects": [{"object": "water bottle", "location": "on desk", "confidence": 0.9}],
  "activity": "Person working at desk"
}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'video/webm',
          data: base64Video
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const timestamp = Date.now();
      const relativeTime = Math.floor((timestamp - session.startedAt) / 1000);

      // Add to session memory
      if (parsed.objects && parsed.objects.length > 0) {
        parsed.objects.forEach(obj => {
          session.objects.push({
            object: obj.object,
            location: obj.location,
            confidence: obj.confidence || 0.7,
            timestamp,
            relativeTime: `${Math.floor(relativeTime / 60)}:${String(relativeTime % 60).padStart(2, '0')}`,
            chunkIndex: session.chunks.length
          });
        });
      }

      if (parsed.activity) {
        session.activities.push({
          activity: parsed.activity,
          timestamp,
          relativeTime: `${Math.floor(relativeTime / 60)}:${String(relativeTime % 60).padStart(2, '0')}`,
          chunkIndex: session.chunks.length
        });
      }

      session.chunks.push({
        timestamp,
        relativeTime,
        objects: parsed.objects || [],
        activity: parsed.activity
      });

      session.lastChunkAnalysis = timestamp;

      // Keep only last 20 minutes of memory (to prevent unbounded growth)
      const twentyMinutesAgo = timestamp - (20 * 60 * 1000);
      session.objects = session.objects.filter(obj => obj.timestamp > twentyMinutesAgo);
      session.activities = session.activities.filter(act => act.timestamp > twentyMinutesAgo);
      session.chunks = session.chunks.filter(chunk => chunk.timestamp > twentyMinutesAgo);
    }
  } catch (error) {
    console.error('Error analyzing chunk for memory:', error);
    // Still store chunk metadata even if analysis fails
    const timestamp = Date.now();
    const relativeTime = Math.floor((timestamp - session.startedAt) / 1000);
    session.chunks.push({
      timestamp,
      relativeTime,
      objects: [],
      activity: 'Analysis failed'
    });
  }
}

// Start live stream session
app.post('/api/live-stream/start', async (req, res) => {
  try {
    const { userId } = req.body;
    const session = getLiveStreamSession(userId || 'anonymous');
    
    res.json({
      success: true,
      sessionId: session.userId,
      startedAt: session.startedAt,
      message: 'Live stream session started'
    });
  } catch (error) {
    console.error('Error starting live stream session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Store video chunk in session memory (background processing)
app.post('/api/live-stream/chunk', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video chunk provided' });
    }

    const { userId } = req.body;
    const session = getLiveStreamSession(userId || 'anonymous');
    const videoPath = req.file.path;

    // Analyze chunk in background (non-blocking)
    analyzeVideoChunkForMemory(videoPath, session)
      .then(() => {
        // Clean up file after analysis
        fs.unlink(videoPath).catch(() => {});
      })
      .catch(err => {
        console.error('Error processing chunk:', err);
        fs.unlink(videoPath).catch(() => {});
      });

    // Return immediately - processing happens in background
    res.json({
      success: true,
      chunkIndex: session.chunks.length,
      memorySize: {
        objects: session.objects.length,
        activities: session.activities.length
      }
    });
  } catch (error) {
    console.error('Error storing chunk:', error);
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ error: error.message });
  }
});

// Live stream question answering with memory (optimized for real-time)
app.post('/api/live-answer', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video chunk provided' });
    }

    const { question, userId, timestamp } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Get or create session
    const session = getLiveStreamSession(userId || 'anonymous');

    // Rate limiting - prevent too many API calls
    const userKey = `${userId}-${Date.now() - (Date.now() % RATE_LIMIT_WINDOW)}`;
    const userRequests = liveAnswerCache.get(userKey) || 0;
    
    if (userRequests >= MAX_QUESTIONS_PER_WINDOW) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(429).json({ 
        error: 'Too many questions. Please wait a few seconds.',
        retryAfter: RATE_LIMIT_WINDOW / 1000
      });
    }

    liveAnswerCache.set(userKey, userRequests + 1);
    setTimeout(() => liveAnswerCache.delete(userKey), RATE_LIMIT_WINDOW);

    // Check for duplicate questions
    const questionHash = question.toLowerCase().trim().substring(0, 50);
    const cacheKey = `${userId}-${questionHash}`;
    const cached = liveAnswerCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < 10000) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.json({
        answer: cached.answer,
        question,
        timestamp: timestamp ? parseInt(timestamp) : Date.now(),
        cached: true
      });
    }

    const videoPath = req.file.path;
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const videoData = await fs.readFile(videoPath);
    const base64Video = videoData.toString('base64');

    // Check if question is about past/memory (e.g., "did I leave", "a few minutes ago", "earlier")
    const lowerQuestion = question.toLowerCase();
    const isMemoryQuestion = lowerQuestion.includes('did i') || 
                            lowerQuestion.includes('left') || 
                            lowerQuestion.includes('ago') || 
                            lowerQuestion.includes('earlier') ||
                            lowerQuestion.includes('before') ||
                            lowerQuestion.includes('minutes ago') ||
                            lowerQuestion.includes('was there');

    let prompt;
    let memoryContext = '';

    if (isMemoryQuestion && session.objects.length > 0) {
      // Memory-based question - use session history
      const recentObjects = session.objects
        .slice(-50) // Last 50 objects
        .map(obj => ({
          object: obj.object,
          location: obj.location,
          time: obj.relativeTime,
          confidence: obj.confidence
        }));

      const recentActivities = session.activities
        .slice(-20) // Last 20 activities
        .map(act => ({
          activity: act.activity,
          time: act.relativeTime
        }));

      memoryContext = `
Session Memory (from last ${Math.floor((Date.now() - session.startedAt) / 60000)} minutes):
Objects seen: ${JSON.stringify(recentObjects, null, 2)}
Activities: ${JSON.stringify(recentActivities, null, 2)}
`;

      prompt = `Question: "${question}"

${memoryContext}

Current video context (what's visible NOW):
[Analyze the current video segment]

Answer the question by combining:
1. Current video context (what's visible right now)
2. Session memory (what happened in the last few minutes)

If the question asks about something from the past (like "did I leave X"), search through the session memory.
If asking about current state, focus on the current video.

Provide a clear, concise answer (2-3 sentences):`;
    } else {
      // Current context question
      prompt = `Question: "${question}"

Analyze this short video segment (last few seconds) and answer the question.
Focus on what is visible RIGHT NOW in the video.

Answer (2-3 sentences, be concise):`;
    }

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'video/webm',
          data: base64Video
        }
      }
    ]);

    const response = await result.response;
    const answer = response.text().trim();

    // Cache the answer
    liveAnswerCache.set(cacheKey, {
      answer,
      timestamp: Date.now()
    });

    // Generate voice response
    const voiceAudio = await generateVoiceResponse(answer);

    // Clean up file
    await fs.unlink(videoPath).catch(() => {});

    // Log to Snowflake
    await sendToSnowflake({
      event: 'live_question_answered',
      userId,
      questionType: isMemoryQuestion ? 'memory' : 'current',
      questionLength: question.length,
      answerLength: answer.length,
      memoryObjectsUsed: isMemoryQuestion ? session.objects.length : 0,
      timestamp: new Date()
    });

    res.json({
      answer,
      question,
      timestamp: timestamp ? parseInt(timestamp) : Date.now(),
      voiceAudio: voiceAudio ? `data:audio/mpeg;base64,${voiceAudio}` : null,
      usedMemory: isMemoryQuestion,
      memoryContext: isMemoryQuestion ? {
        objectsFound: session.objects.length,
        activitiesFound: session.activities.length
      } : null
    });
  } catch (error) {
    console.error('Live answer error:', error);
    
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    
    res.status(500).json({ error: error.message });
  }
});

// End live stream session
app.post('/api/live-stream/end', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (liveStreamSessions.has(userId || 'anonymous')) {
      const session = liveStreamSessions.get(userId || 'anonymous');
      const duration = Math.floor((Date.now() - session.startedAt) / 1000);
      
      // Optionally save session to MongoDB for later reference
      if (session.objects.length > 0 || session.activities.length > 0) {
        await db.collection('live_sessions').insertOne({
          userId: userId || 'anonymous',
          startedAt: new Date(session.startedAt),
          endedAt: new Date(),
          duration: duration,
          objects: session.objects.slice(-100), // Keep last 100 objects
          activities: session.activities.slice(-50), // Keep last 50 activities
          chunksProcessed: session.chunks.length
        });
      }
      
      liveStreamSessions.delete(userId || 'anonymous');
      
      res.json({
        success: true,
        duration: duration,
        objectsDetected: session.objects.length,
        activitiesDetected: session.activities.length
      });
    } else {
      res.json({ success: true, message: 'No active session found' });
    }
  } catch (error) {
    console.error('Error ending live stream session:', error);
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

