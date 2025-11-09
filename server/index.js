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

// Rate limiting and retry logic for Gemini API
const geminiRequestQueue = [];
let isProcessingQueue = false;
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // Minimum 1 second between requests
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000; // 2 seconds

// Helper: Sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Format timestamp to human-readable relative time
function formatRelativeTime(timestamp, sessionDate = null) {
  if (!timestamp && !sessionDate) return 'earlier';
  
  const date = sessionDate ? new Date(sessionDate) : new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  // For older dates, use a readable format
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

// Helper: Format object description with context-aware details
function formatObjectDescription(obj) {
  const parts = [];
  const objName = (obj.object || '').toLowerCase();
  
  // Start with the main object name
  if (obj.object) parts.push(obj.object);
  
  // Context-aware descriptor selection based on object type
  const details = [];
  
  // For drinks/beverages: prioritize flavor and brand, skip colors/accents
  if (objName.includes('drink') || objName.includes('can') || objName.includes('bottle') || 
      objName.includes('soda') || objName.includes('energy') || objName.includes('water') ||
      objName.includes('juice') || objName.includes('coffee') || objName.includes('tea')) {
    if (obj.flavor) details.push(obj.flavor);
    if (obj.brand) details.push(obj.brand);
    // For water bottles specifically, include color and size
    if (objName.includes('water') && !objName.includes('energy')) {
      if (obj.color) details.push(obj.color);
      if (obj.size) details.push(obj.size);
    }
  }
  // For containers/bottles (non-drink): prioritize color and size
  else if (objName.includes('bottle') || objName.includes('container') || objName.includes('jar')) {
    if (obj.color) details.push(obj.color);
    if (obj.size) details.push(obj.size);
    if (obj.brand) details.push(obj.brand);
  }
  // For food items: prioritize flavor and brand
  else if (objName.includes('snack') || objName.includes('food') || objName.includes('package') ||
           objName.includes('bag') || objName.includes('chips') || objName.includes('candy')) {
    if (obj.flavor) details.push(obj.flavor);
    if (obj.brand) details.push(obj.brand);
    if (obj.size) details.push(obj.size);
  }
  // For electronics: prioritize brand and model/text
  else if (objName.includes('phone') || objName.includes('cellphone') || objName.includes('device') ||
           objName.includes('laptop') || objName.includes('tablet') || objName.includes('computer')) {
    if (obj.brand) details.push(obj.brand);
    if (obj.text) details.push(obj.text);
    if (obj.color) details.push(obj.color);
  }
  // For clothing: prioritize color and size
  else if (objName.includes('shirt') || objName.includes('pants') || objName.includes('jacket') ||
           objName.includes('hat') || objName.includes('shoe') || objName.includes('clothing')) {
    if (obj.color) details.push(obj.color);
    if (obj.size) details.push(obj.size);
    if (obj.brand) details.push(obj.brand);
  }
  // Default: include all relevant details
  else {
    if (obj.color) details.push(obj.color);
    if (obj.brand) details.push(obj.brand);
    if (obj.flavor) details.push(obj.flavor);
    if (obj.size) details.push(obj.size);
  }
  
  // Add details in parentheses if we have any
  if (details.length > 0) {
    parts.push(`(${details.join(', ')})`);
  }
  
  // Add additional details if provided and not redundant
  if (obj.details && !obj.details.toLowerCase().includes(obj.object?.toLowerCase() || '')) {
    // Only add if it provides new information
    const detailLower = obj.details.toLowerCase();
    const alreadyIncluded = details.some(d => detailLower.includes(d.toLowerCase()));
    if (!alreadyIncluded) {
      parts.push(`- ${obj.details}`);
    }
  }
  
  return parts.join(' ');
}

// Helper: Generate content with rate limiting and retry logic
async function generateContentWithRetry(model, prompt, options = {}) {
  const { maxRetries = MAX_RETRIES, retryDelay = INITIAL_RETRY_DELAY } = options;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Rate limiting: ensure minimum interval between requests
      const timeSinceLastRequest = Date.now() - lastRequestTime;
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await sleep(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
      }
      
      lastRequestTime = Date.now();
      
      // Make the API call
      const result = await model.generateContent(prompt);
      return result;
    } catch (error) {
      const isRateLimitError = error.status === 429 || 
                               error.message?.includes('429') ||
                               error.message?.includes('Too Many Requests') ||
                               error.message?.includes('Resource exhausted');
      
      if (isRateLimitError && attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = retryDelay * Math.pow(2, attempt);
        console.warn(`⚠️  Rate limit hit (429). Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
        await sleep(delay);
        continue;
      }
      
      // If it's a rate limit error and we've exhausted retries, throw a user-friendly error
      if (isRateLimitError) {
        throw new Error('API rate limit exceeded. Please wait a moment and try again. The system will automatically retry your request.');
      }
      
      // For other errors, throw immediately
      throw error;
    }
  }
}

// Process request queue
async function processRequestQueue() {
  if (isProcessingQueue || geminiRequestQueue.length === 0) {
    return;
  }
  
  isProcessingQueue = true;
  
  while (geminiRequestQueue.length > 0) {
    const { model, prompt, resolve, reject, options } = geminiRequestQueue.shift();
    
    try {
      const result = await generateContentWithRetry(model, prompt, options);
      resolve(result);
    } catch (error) {
      reject(error);
    }
    
    // Small delay between queue items
    if (geminiRequestQueue.length > 0) {
      await sleep(MIN_REQUEST_INTERVAL);
    }
  }
  
  isProcessingQueue = false;
}

// Queue a request (for future use if needed)
async function queueGeminiRequest(model, prompt, options = {}) {
  return new Promise((resolve, reject) => {
    geminiRequestQueue.push({ model, prompt, resolve, reject, options });
    processRequestQueue();
  });
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

    const result = await generateContentWithRetry(model, [
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

        const result = await generateContentWithRetry(model, [
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

    const result = await generateContentWithRetry(model, [
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
      await db.collection('videos').createIndex({ userId: 1, filename: 1 }); // For duplicate detection
      // Query cache indexes
      await db.collection('query_cache').createIndex({ cacheKey: 1, expiresAt: 1 });
      await db.collection('query_cache').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
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

// Query cache - store query results to avoid duplicate API calls
async function getCachedQueryResult(userId, query) {
  if (!db) return null;
  
  const queryHash = query.toLowerCase().trim().replace(/\s+/g, ' ');
  const cacheKey = `${userId}:${queryHash}`;
  
  // Check cache (30 minute TTL)
  const cached = await db.collection('query_cache').findOne({
    cacheKey,
    expiresAt: { $gt: new Date() }
  });
  
  if (cached) {
    console.log('💾 Using cached query result');
    return cached.result;
  }
  
  return null;
}

async function setCachedQueryResult(userId, query, result) {
  if (!db) return;
  
  const queryHash = query.toLowerCase().trim().replace(/\s+/g, ' ');
  const cacheKey = `${userId}:${queryHash}`;
  
  // Store in cache with 30 minute TTL
  await db.collection('query_cache').updateOne(
    { cacheKey },
    {
      $set: {
        cacheKey,
        userId,
        query,
        result,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      }
    },
    { upsert: true }
  );
}

// Simple keyword matching - try MongoDB search before calling Gemini
async function trySimpleKeywordMatch(userId, query) {
  if (!db) return null;
  
  const lowerQuery = query.toLowerCase();
  
  // Extract object name from simple queries like "where is X" or "where did I leave X"
  const whereMatch = lowerQuery.match(/where\s+(?:is|did\s+i\s+leave|did\s+i\s+put)\s+(?:my\s+)?(.+?)(?:\?|$)/);
  const whatMatch = lowerQuery.match(/what\s+(?:is|was)\s+(?:the\s+)?(.+?)(?:\?|$)/);
  
  const objectName = whereMatch?.[1] || whatMatch?.[1];
  
  if (!objectName || objectName.length < 3) {
    return null; // Too short or no match, use Gemini
  }
  
  // Try to find object in MongoDB using text search
  const searchTerm = objectName.trim();
  
  const videos = await db.collection('videos')
    .find({
      userId,
      processed: true,
      $or: [
        { 'objects.object': { $regex: searchTerm, $options: 'i' } },
        { summary: { $regex: searchTerm, $options: 'i' } }
      ]
    })
    .sort({ uploadedAt: -1 })
    .limit(10)
    .project({
      filename: 1,
      uploadedAt: 1,
      objects: 1,
      summary: 1,
      _id: 1
    })
    .toArray();
  
  if (videos.length === 0) {
    return null; // No matches, use Gemini
  }
  
  // Found matches - construct simple response without Gemini
  const matches = [];
  for (const video of videos) {
    const matchingObjects = (video.objects || []).filter(obj => 
      obj.object?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (matchingObjects.length > 0) {
      const bestMatch = matchingObjects[0];
      matches.push({
        videoId: video._id.toString(),
        filename: video.filename,
        timestamp: bestMatch.timestamp || 'unknown',
        location: bestMatch.location || 'unknown location',
        confidence: bestMatch.confidence || 0.8,
        uploadedAt: video.uploadedAt,
        relevantInfo: `Found ${bestMatch.object} at ${bestMatch.location}`
      });
    }
  }
  
  if (matches.length === 0) {
    return null;
  }
  
  console.log('🔍 Using simple keyword match (skipped Gemini API call)');
  
  return {
    queryType: 'location',
    object: searchTerm,
    answer: `I found ${matches.length} match(es) for "${searchTerm}". ${matches[0].location ? `It was last seen ${matches[0].location}` : 'Found in your videos'}.`,
    matches: matches,
    bestMatch: matches[0],
    fromCache: false,
    fromKeywordMatch: true
  };
}

// Query objects using Gemini for natural language understanding
async function queryObjects(userId, query) {
  if (!genAI) {
    throw new Error('Gemini AI not initialized');
  }

  // OPTIMIZATION 1: Check cache first
  const cached = await getCachedQueryResult(userId, query);
  if (cached) {
    return cached;
  }
  
  // OPTIMIZATION 2: Try simple keyword matching before Gemini
  const keywordMatch = await trySimpleKeywordMatch(userId, query);
  if (keywordMatch) {
    // Cache the keyword match result
    await setCachedQueryResult(userId, query, keywordMatch);
    return keywordMatch;
  }

  // Get all user's video data (limit to recent 50 to reduce payload size)
  // Only get processed videos with actual data
  const videos = await db.collection('videos')
    .find({ 
      userId,
      processed: true,
      $or: [
        { 'objects.0': { $exists: true } }, // Has at least one object
        { summary: { $ne: '' } } // Or has a summary
      ]
    })
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

  // If no processed videos found, return helpful message
  if (videos.length === 0) {
    const unprocessedCount = await db.collection('videos').countDocuments({ 
      userId, 
      processed: false 
    });
    
    if (unprocessedCount > 0) {
      return {
        queryType: 'general',
        object: '',
        answer: `I found ${unprocessedCount} video(s) that are still being processed. Please wait a few moments and try again.`,
        matches: [],
        bestMatch: null
      };
    }
    
    return {
      queryType: 'general',
      object: '',
      answer: "I don't have any processed videos yet. Please upload a video and wait for it to be processed.",
      matches: [],
      bestMatch: null
    };
  }

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

  const result = await generateContentWithRetry(model, searchPrompt);
  const response = await result.response;
  const text = response.text();
  
  // Parse JSON response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse Gemini response');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  
  // OPTIMIZATION 3: Cache the Gemini result
  await setCachedQueryResult(userId, query, parsed);
  
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

  // OPTIMIZATION: Check cache first
  const cached = await getCachedQueryResult(userId, query);
  if (cached && cached.queryType === 'general') {
    return cached;
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
    // Prefer processed videos, but include unprocessed ones if no processed videos exist
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
        processed: 1,
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

  // Filter to only processed videos with data, or try to use video file directly
  const processedVideos = videos.filter(v => 
    v.processed && (
      (v.objects && v.objects.length > 0) || 
      (v.summary && v.summary.trim() !== '')
    )
  );

  // If no processed videos but we have video files, try analyzing them directly
  if (processedVideos.length === 0 && !videoId) {
    // Check if any videos have videoPath we can analyze
    const videosWithPath = videos.filter(v => v.videoPath);
    if (videosWithPath.length > 0) {
      // Try analyzing the most recent video directly
      try {
        const videoToAnalyze = videosWithPath[0];
        const videoData = await fs.readFile(videoToAnalyze.videoPath);
        const base64Video = videoData.toString('base64');
        
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        const prompt = `User question: "${query}"

Analyze this video and answer the question in detail. Provide:
1. A clear, comprehensive answer
2. Relevant timestamps where the answer can be found
3. Any important details or context

Answer:`;

        const result = await generateContentWithRetry(model, [
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
          videoId: videoToAnalyze._id.toString(),
          filename: videoToAnalyze.filename,
          matches: [{
            videoId: videoToAnalyze._id.toString(),
            filename: videoToAnalyze.filename,
            relevantInfo: answer,
            uploadedAt: videoToAnalyze.uploadedAt
          }],
          bestMatch: {
            videoId: videoToAnalyze._id.toString(),
            filename: videoToAnalyze.filename,
            relevantInfo: answer,
            uploadedAt: videoToAnalyze.uploadedAt
          }
        };
      } catch (error) {
        console.error('Error analyzing video directly:', error);
        // Fall through to check for unprocessed videos
      }
    }

    // Check if videos are still processing
    const unprocessedCount = videos.filter(v => !v.processed || (!v.objects?.length && !v.summary)).length;
    if (unprocessedCount > 0) {
      return {
        answer: `I found ${unprocessedCount} video(s) that are still being processed. Please wait a few moments and try again. The videos are being analyzed by AI to extract objects, activities, and other information.`,
        queryType: 'general',
        matches: []
      };
    }
  }

  // Use processed videos if available, otherwise fall back to all videos
  const videosToUse = processedVideos.length > 0 ? processedVideos : videos;

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

      const result = await generateContentWithRetry(model, [
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
${JSON.stringify(videosToUse.map(v => ({
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

  const apiResult = await generateContentWithRetry(model, prompt);
  const response = await apiResult.response;
  const text = response.text();
  
  // Parse JSON response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  let result;
  
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    result = {
      answer: parsed.answer || text,
      queryType: 'general',
      matches: parsed.matches || [],
      bestMatch: parsed.bestMatch
    };
  } else {
    // Fallback: return text as answer
    result = {
      answer: text,
      queryType: 'general',
      matches: videosToUse.map(v => ({
        videoId: v._id.toString(),
        filename: v.filename,
        uploadedAt: v.uploadedAt
      }))
    };
  }
  
  // OPTIMIZATION: Cache the result
  await setCachedQueryResult(userId, query, result);
  
  return result;
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
    
    // OPTIMIZATION: Check if video with same filename was already processed
    const filename = path.basename(videoPath);
    const existingVideo = await db.collection('videos').findOne({
      userId,
      filename: filename,
      processed: true
    });
    
    if (existingVideo) {
      console.log('⏭️  Skipping duplicate video processing');
      // Clean up duplicate file
      await fs.unlink(videoPath).catch(() => {});
      return res.json({
        success: true,
        videoId: existingVideo._id.toString(),
        filename: filename,
        message: 'Video already processed (using cached result)',
        cached: true
      });
    }

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
    
    // Check if it's a rate limit error
    const isRateLimitError = error.status === 429 || 
                             error.message?.includes('429') ||
                             error.message?.includes('Too Many Requests') ||
                             error.message?.includes('Resource exhausted') ||
                             error.message?.includes('rate limit');
    
    if (isRateLimitError) {
      return res.status(429).json({ 
        error: 'API rate limit exceeded. The system is automatically retrying your request. Please wait a moment and try again.',
        retryAfter: 60 // Suggest waiting 60 seconds
      });
    }
    
    res.status(500).json({ 
      error: error.message || 'An error occurred while processing your query. Please try again.' 
    });
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

// Retrieve historical session memories from MongoDB
async function getHistoricalSessionMemories(userId, limit = 10) {
  try {
    if (!db) {
      console.warn('MongoDB not connected, cannot retrieve historical memories');
      return { objects: [], activities: [] };
    }

    const historicalSessions = await db.collection('live_sessions')
      .find({ userId: userId || 'anonymous' })
      .sort({ endedAt: -1 }) // Most recent first
      .limit(limit)
      .project({
        objects: 1,
        activities: 1,
        startedAt: 1,
        endedAt: 1,
        duration: 1
      })
      .toArray();

    // Combine all objects and activities from historical sessions
    const allHistoricalObjects = [];
    const allHistoricalActivities = [];

    historicalSessions.forEach(session => {
      if (session.objects && Array.isArray(session.objects)) {
        session.objects.forEach(obj => {
          allHistoricalObjects.push({
            ...obj,
            sessionDate: session.startedAt,
            sessionEnded: session.endedAt
          });
        });
      }
      if (session.activities && Array.isArray(session.activities)) {
        session.activities.forEach(act => {
          allHistoricalActivities.push({
            ...act,
            sessionDate: session.startedAt,
            sessionEnded: session.endedAt
          });
        });
      }
    });

    return {
      objects: allHistoricalObjects,
      activities: allHistoricalActivities,
      sessionCount: historicalSessions.length
    };
  } catch (error) {
    console.error('Error retrieving historical session memories:', error);
    return { objects: [], activities: [], sessionCount: 0 };
  }
}

// Analyze video chunk and extract objects/activities (lightweight analysis)
// Only analyzes every Nth chunk to save API costs (configurable)
const CHUNK_ANALYSIS_INTERVAL = 2; // Analyze every 2nd chunk (~6 seconds of video)

async function analyzeVideoChunkForMemory(videoPath, session) {
  if (!genAI) return;

  // Skip analysis if we've analyzed too recently (throttle to save API costs)
  // INCREASED from 6 seconds to 20 seconds to reduce API calls
  const lastAnalysis = session.lastChunkAnalysis || 0;
  const timeSinceLastAnalysis = Date.now() - lastAnalysis;
  const minInterval = 20000; // Analyze at most every 20 seconds (was 6 seconds)

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

    // Detailed analysis - extract objects with full details including colors, flavors, brands, text, and all distinguishing features
    const prompt = `Analyze this short video segment (3 seconds) in EXTREME DETAIL and extract:

1. OBJECTS: List ALL visible objects with COMPLETE DETAILS including:
   - Full object name/description
   - Colors (e.g., "red", "blue", "transparent")
   - Flavors (if applicable, e.g., "cherry", "vanilla", "cola")
   - Brand names (if visible)
   - Text/labels visible on objects
   - Sizes (if discernible)
   - Any other distinguishing features (patterns, shapes, materials, etc.)
   - Precise location description (surrounding context)
   - Confidence score

2. KEY_ACTIVITY: Detailed description of what's happening (include colors, actions, interactions)

Be EXTREMELY specific and detailed. Include every visible detail like colors, flavors, text, brands, sizes, and any distinguishing characteristics.

Return JSON:
{
  "objects": [
    {
      "object": "red cherry flavored Coca-Cola can",
      "location": "on desk, center-right, next to laptop",
      "color": "red",
      "flavor": "cherry",
      "brand": "Coca-Cola",
      "text": "Coca-Cola Cherry",
      "size": "12 oz can",
      "confidence": 0.95,
      "details": "Red aluminum can with white Coca-Cola logo, cherry flavor label visible"
    }
  ],
  "activity": "Person working at desk with red cherry Coca-Cola can visible on the right side"
}`;

    const result = await generateContentWithRetry(model, [
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

      // Add to session memory with all detailed information
      if (parsed.objects && parsed.objects.length > 0) {
        parsed.objects.forEach(obj => {
          session.objects.push({
            object: obj.object || obj.name || 'unknown object',
            location: obj.location || 'unknown location',
            color: obj.color || null,
            flavor: obj.flavor || null,
            brand: obj.brand || null,
            text: obj.text || null,
            size: obj.size || null,
            details: obj.details || obj.description || null,
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
    
    // Declare variables for memory question detection (needed in catch block)
    let isMemoryQuestion = false;
    let useMemoryOnly = false;
    let model = null;

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

    // Check if Gemini is initialized
    if (!genAI) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(500).json({ 
        error: 'Gemini AI not initialized. Please check your GEMINI_API_KEY in .env file.' 
      });
    }

    const videoPath = req.file.path;
    
    // Validate video file
    const videoData = await fs.readFile(videoPath);
    const videoSize = videoData.length;
    
    // Check if video is too small (likely corrupted or empty)
    if (videoSize < 1000) { // Less than 1KB is suspicious
      await fs.unlink(videoPath).catch(() => {});
      return res.status(400).json({ 
        error: 'Video chunk is too small or empty. Please try again.' 
      });
    }
    
    // Check if video is too large (Gemini has limits - typically 20MB for base64)
    // Base64 encoding increases size by ~33%, so 15MB raw = ~20MB base64
    const MAX_VIDEO_SIZE = 15 * 1024 * 1024; // 15MB
    if (videoSize > MAX_VIDEO_SIZE) {
      await fs.unlink(videoPath).catch(() => {});
      return res.status(400).json({ 
        error: 'Video chunk is too large. Please use shorter video segments.' 
      });
    }
    
    // Detect actual mimeType from file
    const detectedMimeType = req.file.mimetype || 'video/webm';
    // Ensure we use a valid mimeType for Gemini
    const validMimeTypes = ['video/webm', 'video/mp4', 'video/quicktime', 'video/x-msvideo'];
    const mimeType = validMimeTypes.includes(detectedMimeType) ? detectedMimeType : 'video/webm';
    
    // Initialize model
    model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const base64Video = videoData.toString('base64');
    
    // Log video info for debugging
    console.log(`📹 Processing video chunk: ${(videoSize / 1024).toFixed(2)}KB, mimeType: ${mimeType}`);
    
    // Check if question is about past/memory (e.g., "did I leave", "what was", "just showed")
    // NOTE: Present tense questions like "what am I holding" should analyze current video, not memory
    const lowerQuestion = question.toLowerCase();
    
    // Present tense indicators - these should analyze current video, not memory
    const isPresentTense = lowerQuestion.includes('what am i') ||
                          lowerQuestion.includes('what are you') ||
                          lowerQuestion.includes('what is') ||
                          lowerQuestion.includes('what\'s') ||
                          lowerQuestion.includes('what do you see') ||
                          lowerQuestion.includes('what can you see') ||
                          lowerQuestion.includes('what does this') ||
                          lowerQuestion.includes('what\'s this') ||
                          lowerQuestion.includes('what\'s that');
    
    // Only treat as memory question if it's clearly about the past AND not present tense
    isMemoryQuestion = !isPresentTense && (
                            lowerQuestion.includes('did i') || 
                            lowerQuestion.includes('left') || 
                            lowerQuestion.includes('ago') || 
                            lowerQuestion.includes('earlier') ||
                            lowerQuestion.includes('before') ||
                            lowerQuestion.includes('minutes ago') ||
                            lowerQuestion.includes('was there') ||
                            lowerQuestion.includes('what was') ||
                            lowerQuestion.includes('just showed') ||
                            lowerQuestion.includes('just did') ||
                            lowerQuestion.includes('showed you') ||
                            lowerQuestion.includes('showed me') ||
                            lowerQuestion.includes('i just') ||
                            lowerQuestion.includes('i showed') ||
                            lowerQuestion.includes('remember') ||
                            lowerQuestion.includes('what did i') ||
                            (lowerQuestion.includes('held up') && !lowerQuestion.includes('what am i')) || // "what did I hold up" not "what am I holding up"
                            (lowerQuestion.includes('i held') && !lowerQuestion.includes('what am i')) ||
                            lowerQuestion.includes('did i hold'));

    let prompt;
    let memoryContext = '';

    // For memory questions, check both current session and historical sessions
    // For present tense questions, skip memory lookup and analyze current video directly
    if (isMemoryQuestion && !isPresentTense) {
      // Get current session objects and activities with all detailed information, formatted for readability
      // Always use absolute timestamp for time calculation, not relativeTime
      const currentObjects = session.objects
        .slice(-50) // Last 50 objects
        .map(obj => {
          // Use absolute timestamp, not relativeTime (which is relative to session start)
          const timeStr = formatRelativeTime(obj.timestamp);
          return {
            description: formatObjectDescription(obj),
            location: obj.location,
            time: timeStr,
            confidence: obj.confidence,
            source: 'current session'
          };
        });

      const currentActivities = session.activities
        .slice(-20) // Last 20 activities
        .map(act => ({
          activity: act.activity,
          time: formatRelativeTime(act.timestamp), // Always use absolute timestamp
          source: 'current session'
        }));

      // Get historical session memories from MongoDB (only for past-tense questions)
      const historicalMemories = await getHistoricalSessionMemories(userId || 'anonymous', 10);
      
      // Combine current and historical objects/activities
      const allObjects = [
        ...currentObjects,
        ...historicalMemories.objects
          .slice(-100) // Last 100 from historical sessions
          .map(obj => {
            // Use absolute timestamp or sessionDate for accurate time calculation
            const timeStr = formatRelativeTime(obj.timestamp || obj.sessionDate);
            return {
              description: formatObjectDescription(obj),
              location: obj.location || 'unknown location',
              time: timeStr,
              confidence: obj.confidence || 0.7,
              source: 'previous session',
              sessionDate: obj.sessionDate
            };
          })
      ];

      const allActivities = [
        ...currentActivities,
          ...historicalMemories.activities
          .slice(-50) // Last 50 from historical sessions
          .map(act => ({
            activity: act.activity,
            time: formatRelativeTime(act.timestamp || act.sessionDate), // Always use absolute timestamp
            source: 'previous session',
            sessionDate: act.sessionDate
          }))
      ];

      // Always proceed with memory questions - even if current session is empty, check historical
      const currentSessionDuration = Math.floor((Date.now() - session.startedAt) / 60000);
      
      // Format memory context in a human-readable way
      const currentObjectsList = currentObjects.length > 0 
        ? currentObjects.map(obj => `  • ${obj.description} (${obj.time}, ${obj.location})`).join('\n')
        : '  (none yet)';
      
      const historicalObjectsList = allObjects.filter(obj => obj.source === 'previous session').length > 0
        ? allObjects.filter(obj => obj.source === 'previous session')
            .map(obj => `  • ${obj.description} (${obj.time}, ${obj.location})`)
            .join('\n')
        : '  (none)';
      
      memoryContext = `MEMORY DATA:

CURRENT SESSION (active for ${currentSessionDuration} minute${currentSessionDuration !== 1 ? 's' : ''}):
Objects seen:
${currentObjectsList}

PREVIOUS SESSIONS:
Objects from earlier sessions:
${historicalObjectsList}

Full detailed data:
${JSON.stringify(allObjects, null, 2)}
`;

      // For strong memory questions (past tense, "just", "was"), prioritize memory
      // Exclude present tense questions
      const isStrongMemoryQuestion = !isPresentTense && (
                                     lowerQuestion.includes('what was') ||
                                     lowerQuestion.includes('just showed') ||
                                     lowerQuestion.includes('just did') ||
                                     lowerQuestion.includes('i just') ||
                                     lowerQuestion.includes('did i leave') ||
                                     lowerQuestion.includes('was there') ||
                                     (lowerQuestion.includes('held up') && lowerQuestion.includes('did i')) || // "what did I hold up" not "what am I holding up"
                                     (lowerQuestion.includes('i held') && !lowerQuestion.includes('what am i')) ||
                                     lowerQuestion.includes('what did'));

      if (isStrongMemoryQuestion) {
        // Answer from memory only - don't require video
        useMemoryOnly = true;
        prompt = `Question: "${question}"

${memoryContext}

INSTRUCTIONS FOR YOUR RESPONSE:
- Start directly with bullet points, NO introductory sentences
- Use simple, clear language
- Format timestamps as relative time (e.g., "2 hours ago", "yesterday", "earlier today")
- Each bullet point should be on its own line: "• [time] - [object description with details]"
- Put each bullet point on a NEW LINE (one per line)
- Be specific about object details (colors, brands, flavors) when available
- Group by time order (most recent first)
- Keep it concise and direct

Search through ALL the session memories provided above (both current and historical sessions) and list what was held up in bullet point format, starting with the most recent. Put each bullet point on a separate line.`;
      } else {
        // Combine memory with current video
        prompt = `Question: "${question}"

${memoryContext}

Current video context (what's visible NOW):
[Analyze the current video segment]

INSTRUCTIONS FOR YOUR RESPONSE:
- Answer in a natural, conversational way that's easy to read and listen to
- Use simple, clear language
- Format timestamps as relative time (e.g., "2 hours ago", "just now")
- Be specific about object details (colors, brands, flavors) when available
- Make it sound natural, like you're talking to a friend

Answer the question by combining:
1. Current video context (what's visible right now)
2. All session memories (current + historical sessions)

If the question asks about something from the past, search through ALL session memories.
If asking about current state, focus on the current video.

Provide a clear, natural-sounding answer:`;
      }
    } else {
      // Current context question
      prompt = `Question: "${question}"

Analyze this short video segment (last few seconds) and answer the question.
Focus on what is visible RIGHT NOW in the video.

INSTRUCTIONS FOR YOUR RESPONSE:
- Answer in a natural, conversational way that's easy to read and listen to
- Use simple, clear language
- Be specific about object details (colors, brands, flavors) when visible
- Make it sound natural, like you're talking to a friend

Provide a clear, natural-sounding answer:`;
    }

    let result;
    if (useMemoryOnly) {
      // Answer from memory only - no video needed
      result = await generateContentWithRetry(model, prompt);
    } else {
      // Include video in the request
      result = await generateContentWithRetry(model, [
        prompt,
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Video
          }
        }
      ]);
    }

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
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      status: error.status,
      statusText: error.statusText
    });
    
    // Clean up file if it exists
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    
    // Check for specific error types
    const isBadRequest = error.status === 400 || 
                        error.message?.includes('400') ||
                        error.message?.includes('Bad Request') ||
                        error.message?.includes('invalid argument');
    
    // If it's a memory question and video processing failed, try memory-only fallback
    // Check both current session and historical sessions
    if (isMemoryQuestion && (isBadRequest || !useMemoryOnly)) {
      console.log('🔄 Video processing failed for memory question, falling back to memory-only answer...');
      try {
        // Get both current and historical memories for fallback with all detailed information, formatted for readability
        // Always use absolute timestamp for time calculation, not relativeTime
        const currentObjects = session.objects
          .slice(-50)
          .map(obj => {
            // Use absolute timestamp, not relativeTime (which is relative to session start)
            const timeStr = formatRelativeTime(obj.timestamp);
            return {
              description: formatObjectDescription(obj),
              location: obj.location,
              time: timeStr,
              confidence: obj.confidence,
              source: 'current session'
            };
          });

        const currentActivities = session.activities
          .slice(-20)
          .map(act => ({
            activity: act.activity,
            time: formatRelativeTime(act.timestamp), // Always use absolute timestamp
            source: 'current session'
          }));

        const historicalMemories = await getHistoricalSessionMemories(userId || 'anonymous', 10);
        
        const allObjects = [
          ...currentObjects,
          ...historicalMemories.objects
            .slice(-100)
            .map(obj => {
              // Use absolute timestamp or sessionDate for accurate time calculation
              const timeStr = formatRelativeTime(obj.timestamp || obj.sessionDate);
              return {
                description: formatObjectDescription(obj),
                location: obj.location || 'unknown location',
                time: timeStr,
                confidence: obj.confidence || 0.7,
                source: 'previous session'
              };
            })
        ];

        const allActivities = [
          ...currentActivities,
          ...historicalMemories.activities
            .slice(-50)
            .map(act => ({
              activity: act.activity,
              time: formatRelativeTime(act.timestamp || act.sessionDate), // Always use absolute timestamp
              source: 'previous session'
            }))
        ];

        const currentSessionDuration = Math.floor((Date.now() - session.startedAt) / 60000);
        
        // Format memory context in a human-readable way
        const currentObjectsList = currentObjects.length > 0 
          ? currentObjects.map(obj => `  • ${obj.description} (${obj.time}, ${obj.location})`).join('\n')
          : '  (none yet)';
        
        const historicalObjectsList = allObjects.filter(obj => obj.source === 'previous session').length > 0
          ? allObjects.filter(obj => obj.source === 'previous session')
              .map(obj => `  • ${obj.description} (${obj.time}, ${obj.location})`)
              .join('\n')
          : '  (none)';
        
        const memoryContext = `MEMORY DATA:

CURRENT SESSION (active for ${currentSessionDuration} minute${currentSessionDuration !== 1 ? 's' : ''}):
Objects seen:
${currentObjectsList}

PREVIOUS SESSIONS:
Objects from earlier sessions:
${historicalObjectsList}

Full detailed data:
${JSON.stringify(allObjects, null, 2)}
`;

        const fallbackPrompt = `Question: "${question}"

${memoryContext}

INSTRUCTIONS FOR YOUR RESPONSE:
- Start directly with bullet points, NO introductory sentences
- Use simple, clear language
- Format timestamps as relative time (e.g., "2 hours ago", "yesterday", "earlier today")
- Each bullet point should be on its own line: "• [time] - [object description with details]"
- Put each bullet point on a NEW LINE (one per line)
- Be specific about object details (colors, brands, flavors) when available
- Group by time order (most recent first)
- Keep it concise and direct

The video processing failed, but answer this question based on ALL session memories provided above (current + historical sessions).
Search through the objects and activities from ALL sessions to find what the user is asking about.
List the results in bullet point format, starting with the most recent. Put each bullet point on a separate line.`;

        if (!model) {
          model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        }
        const fallbackResult = await generateContentWithRetry(model, fallbackPrompt);
        const fallbackResponse = await fallbackResult.response;
        const fallbackAnswer = fallbackResponse.text().trim();

        const voiceAudio = await generateVoiceResponse(fallbackAnswer);

        return res.json({
          answer: fallbackAnswer,
          question,
          timestamp: timestamp ? parseInt(timestamp) : Date.now(),
          voiceAudio: voiceAudio ? `data:audio/mpeg;base64,${voiceAudio}` : null,
          usedMemory: true,
          memoryContext: {
            objectsFound: session.objects.length,
            activitiesFound: session.activities.length
          },
          fallback: true
        });
      } catch (fallbackError) {
        console.error('Fallback memory answer also failed:', fallbackError);
        // Continue to error response below
      }
    }
    
    if (isBadRequest && !isMemoryQuestion) {
      return res.status(400).json({ 
        error: 'Invalid video format or data. The video chunk may be corrupted or in an unsupported format. Please try again.',
        details: 'Video must be a valid WebM or MP4 file and not empty.'
      });
    }
    
    // Provide more detailed error message
    let errorMessage = 'Unable to generate answer at this time.';
    if (error.message?.includes('API_KEY')) {
      errorMessage = 'Invalid Gemini API key. Please check your GEMINI_API_KEY in .env file.';
    } else if (error.message?.includes('quota') || error.message?.includes('limit')) {
      errorMessage = 'API quota exceeded. Please check your Gemini API usage limits.';
    } else if (error.message) {
      errorMessage = `Error: ${error.message}`;
    }
    
    res.status(500).json({ error: errorMessage });
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

