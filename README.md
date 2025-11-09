# MemoryGlass - AI Spatial Memory for Smart Glasses

**Never forget where you left anything.** MemoryGlass is an AI-powered spatial memory system for smart glasses that records your visual experiences and lets you search for objects using natural language queries. Built for the future of augmented reality and spatial computing.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage Guide](#usage-guide)
- [API Documentation](#api-documentation)
- [Live Streaming](#live-streaming)
- [Deployment](#deployment)
- [Security](#security)
- [Performance](#performance)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Contributing](#contributing)

## 🎯 Overview

MemoryGlass is designed to be the memory layer for smart glasses and AR devices. It continuously records and analyzes visual input, creating a searchable memory database of everything you've seen. Whether you're looking for your keys, trying to remember where you left your laptop, or recalling a conversation, MemoryGlass helps you find it instantly using natural language.

### Key Capabilities

- **Continuous Visual Recording**: Captures everything you see through smart glasses
- **AI-Powered Analysis**: Uses Google Gemini 2.0 Flash to extract objects, activities, people, and scenes
- **Natural Language Search**: Ask questions like "Where did I leave my water bottle?" and get instant answers
- **Real-Time Processing**: Live streaming with real-time Q&A capabilities
- **Persistent Memory**: Remembers across sessions and devices
- **Voice Responses**: Natural voice feedback using ElevenLabs
- **Blockchain Integration**: Mint NFTs for memorable moments on Solana
- **Analytics**: Track usage patterns with Snowflake integration

## 🌟 Features

### Core Features

#### 1. Video Upload & Analysis
- Upload video footage from smart glasses or cameras
- Automatic AI analysis using Gemini Vision AI
- Extracts detailed information:
  - **Objects**: Brand names, flavors, colors, sizes, text content, math problems
  - **Activities**: What's happening in the scene
  - **People**: Individuals present (if any)
  - **Scenes**: Location descriptions and context
  - **Text**: All visible text extracted word-for-word (screens, documents, whiteboards, etc.)
- Stores metadata with timestamps and confidence scores
- Supports MP4, WebM, and other common video formats

#### 2. Natural Language Search
- Ask questions in plain English:
  - "Where did I leave my water bottle?"
  - "What did I show you earlier?"
  - "What objects did I hold up?"
  - "What text was on the screen?"
- Intelligent query understanding:
  - Detects location queries vs. general questions
  - Handles present-tense vs. past-tense questions
  - Understands context and intent
- Returns results with:
  - Best match with highest confidence
  - All matches with locations and timestamps
  - Visual proof from video frames
  - Detailed object information (brand, flavor, text content, etc.)

#### 3. Live Streaming with Memory
- Real-time video streaming from smart glasses
- Continuous object detection and activity tracking
- Automatic memory storage every 10 seconds
- Wake word activation ("hey arvis" or "arvis")
- Real-time Q&A about current or past content
- Session persistence across restarts
- In-memory session management for low latency

#### 4. AR Demo Mode
- Full-screen camera view
- Text-only responses (no voice)
- Wake word detection for hands-free interaction
- Current frame capture for present-tense questions
- Well-formatted, easy-to-read responses
- AR glasses-style transparent overlay

#### 5. Voice Responses
- Natural voice synthesis using ElevenLabs
- Multilingual support
- Automatic voice generation for query responses
- Optional feature (system works without it)

#### 6. Blockchain Integration
- Mint NFTs on Solana for memorable moments
- Tokenized interactions
- Stores NFT metadata in MongoDB
- Optional feature (system works without it)

#### 7. Analytics & Insights
- Snowflake integration for data warehousing
- Tracks video processing events
- Logs user queries and searches
- Optional feature (system works without it)

## 🛠️ Tech Stack

### Frontend
- **React 18.3** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **shadcn-ui** - UI component library
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Lucide React** - Icons

### Backend
- **Node.js 20+** - Runtime
- **Express.js** - Web framework
- **Multer** - File upload handling
- **MongoDB Driver** - Database client

### AI/ML
- **Google Gemini 2.0 Flash** - Vision AI & Natural Language Understanding
  - Model: `gemini-2.0-flash-exp`
  - Used for: Video analysis, object detection, query understanding
- **ElevenLabs** - Voice generation
  - Model: `eleven_multilingual_v2`
  - Voice ID: `21m00Tcm4TlvDq8ikWAM` (default)

### Database
- **MongoDB Atlas** - Cloud database
  - Collections: `videos`, `live_sessions`, `nfts`, `query_cache`

### Blockchain
- **Solana** - NFT minting
  - Network: Mainnet (or Devnet for testing)
  - Library: `@solana/web3.js`

### Analytics
- **Snowflake** - Data warehousing
  - Table: `memoryglass_analytics`

### Hosting
- **Vultr** - Cloud infrastructure
- **Nginx** - Reverse proxy
- **PM2** - Process management

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Smart Glasses / Camera                    │
│                   (Video Feed Source)                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Application                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Homepage   │  │  Dashboard   │  │ AR Demo Mode │     │
│  │   (Index)    │  │ (Upload/Query)│  │(Live Stream) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  React + TypeScript + Vite + shadcn-ui                      │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP/REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API Server                       │
│                    Node.js + Express                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Endpoints:                                      │  │
│  │  • POST /api/upload          (Video upload)          │  │
│  │  • POST /api/query           (Search memories)      │  │
│  │  • POST /api/live-stream/*   (Live streaming)       │  │
│  │  • POST /api/live-answer     (Real-time Q&A)        │  │
│  │  • POST /api/mint-nft        (NFT minting)          │  │
│  │  • GET  /api/videos/:userId  (List videos)          │  │
│  │  • GET  /api/health          (Health check)         │  │
│  └──────────────────────────────────────────────────────┘  │
└───────┬──────────┬──────────┬──────────┬──────────┬────────┘
        │          │          │          │          │
        ▼          ▼          ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│  Gemini  │ │ MongoDB  │ │ Solana   │ │ElevenLabs│ │Snowflake │
│    AI    │ │  Atlas   │ │Blockchain│ │  Voice   │ │Analytics │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

### Data Flow

#### Video Upload Flow
```
1. User uploads video → Frontend
2. Frontend → POST /api/upload (with video file)
3. Backend saves video to disk
4. Backend → Gemini API (analyze video)
5. Gemini returns: objects, activities, people, scenes, text
6. Backend → MongoDB (store metadata)
7. Backend → Snowflake (track event) [optional]
8. Backend → Frontend (success + videoId)
```

#### Query Flow
```
1. User asks question → Frontend
2. Frontend → POST /api/query (with query text)
3. Backend → MongoDB (search cached results)
4. If not cached:
   a. Backend → MongoDB (search video metadata)
   b. Backend → Gemini API (understand query)
   c. Backend → MongoDB (cache result)
5. Backend → ElevenLabs (generate voice) [optional]
6. Backend → Snowflake (track event) [optional]
7. Backend → Frontend (results + voice audio)
```

#### Live Stream Flow
```
1. User starts live stream → Frontend
2. Frontend → POST /api/live-stream/start
3. Frontend sends video chunks every 2 seconds
4. Backend → POST /api/live-stream/chunk
5. Every 10 seconds (5 chunks):
   a. Backend → Gemini API (analyze chunk)
   b. Backend stores in session memory
6. User asks question → Frontend
7. Frontend → POST /api/live-answer (with current frame)
8. Backend → Gemini API (analyze current + memory)
9. Backend → Frontend (answer)
```

## 📦 Installation

### Prerequisites

- **Node.js**: Version 20.x or higher
- **npm**: Version 9.x or higher (comes with Node.js)
- **MongoDB Atlas Account**: Free tier available
- **API Keys**:
  - Google Gemini API (required) - [Get it here](https://makersuite.google.com/app/apikey)
  - ElevenLabs API (optional) - [Get it here](https://elevenlabs.io)
  - Snowflake API (optional) - [Get it here](https://snowflake.com)

### Step-by-Step Installation

#### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd ARVS-Augmented-Recall-Vision-Systems-2
```

#### 2. Install Frontend Dependencies

```bash
npm install
```

This installs all React, TypeScript, and UI dependencies.

#### 3. Install Backend Dependencies

```bash
cd server
npm install
cd ..
```

This installs Express, MongoDB driver, Gemini SDK, and other backend dependencies.

#### 4. Configure API Keys

**Note**: The system currently uses hardcoded API keys in `server/index.js`. To use environment variables instead:

Create a `.env` file in the `server/` directory:

```env
# Required APIs
GEMINI_API_KEY=your_gemini_api_key_here
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/memoryglass?retryWrites=true&w=majority

# Optional APIs
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_WALLET_SECRET=[]
SOLANA_TREASURY=your_treasury_wallet_address
SNOWFLAKE_API_URL=https://your-account.snowflakecomputing.com/api/v1/statements
SNOWFLAKE_API_KEY=your_snowflake_api_key

# Server Configuration
PORT=3001
```

#### 5. Start Development Servers

**Terminal 1 - Backend Server:**
```bash
cd server
npm run dev
```

You should see:
```
✅ Using hardcoded configuration (no .env file needed)
🔑 Gemini API Key: AIzaSyCQ5ZETcuOxiM2...
🚀 MemoryGlass API server running on port 3001
✅ Services initialized:
   - MongoDB: Connected
   - Gemini AI: Initialized
   - Solana: Connected
```

**Terminal 2 - Frontend Development Server:**
```bash
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:8080/
  ➜  Network: use --host to expose
```

#### 6. Verify Installation

1. **Check Backend Health:**
   ```bash
   curl http://localhost:3001/api/health
   ```
   Should return:
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

2. **Open Frontend:**
   - Navigate to http://localhost:8080
   - You should see the MemoryGlass homepage

3. **Test Connections:**
   ```bash
   cd server
   node test-connections.js
   ```

## ⚙️ Configuration

### API Keys Setup

#### Google Gemini API
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key
4. Update `server/index.js` line 17 with your key, or set `GEMINI_API_KEY` in `.env`

#### MongoDB Atlas
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free tier: M0)
3. Create a database user
4. Whitelist your IP address (or use `0.0.0.0/0` for development)
5. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/memoryglass`
6. Update `server/index.js` line 20, or set `MONGODB_URI` in `.env`

#### ElevenLabs (Optional)
1. Sign up at [ElevenLabs](https://elevenlabs.io)
2. Get your API key from dashboard
3. Choose a voice ID (default: `21m00Tcm4TlvDq8ikWAM`)
4. Update `server/index.js` lines 28-29, or set in `.env`

#### Solana (Optional)
1. Use public RPC: `https://api.mainnet-beta.solana.com`
2. Or use devnet: `https://api.devnet.solana.com`
3. For NFT minting, create a wallet and get private key
4. Update `server/index.js` lines 23-25, or set in `.env`

#### Snowflake (Optional)
1. Create Snowflake account
2. Set up API endpoint
3. Get API key
4. Update `server/index.js` lines 32-33, or set in `.env`

### Environment Variables

All configuration is currently hardcoded in `server/index.js`. To use environment variables:

1. Install `dotenv`: `npm install dotenv`
2. Add at top of `server/index.js`:
   ```javascript
   import dotenv from 'dotenv';
   dotenv.config({ path: join(__dirname, '.env') });
   ```
3. Replace `CONFIG.GEMINI_API_KEY` with `process.env.GEMINI_API_KEY`

## 📖 Usage Guide

### 1. Upload Video Footage

1. Navigate to **Dashboard** (`/dashboard`)
2. Click the **"Upload Memory Footage"** tab
3. Click **"Choose File"** or drag and drop a video
4. Select a video file (MP4, WebM, etc.)
5. Wait for processing:
   - Video is uploaded to server
   - Gemini AI analyzes the video
   - Objects, activities, and text are extracted
   - Metadata is stored in MongoDB
6. You'll see a success message with the video ID

**What Gets Extracted:**
- Objects with details (brand, flavor, color, text, etc.)
- Activities happening in the scene
- People present (if any)
- Scene descriptions
- **All visible text** (screens, documents, whiteboards, labels, etc.)
- Math problems and equations
- Timestamps for each detection

### 2. Search Your Memories

1. Go to **"Search Your Memories"** tab in Dashboard
2. Type your question in the search box, for example:
   - "Where did I leave my water bottle?"
   - "What did I show you earlier?"
   - "What text was on the screen?"
   - "What math problem did I solve?"
3. Click **"Search"** or press Enter
4. View results:
   - **Best Match**: Highest confidence result
   - **All Matches**: Complete list with locations and timestamps
   - **Voice Response**: Audio playback (if ElevenLabs configured)
   - **Details**: Brand, flavor, text content, etc.

**Query Types:**
- **Location Queries**: "Where did I leave...?" → Returns location and timestamp
- **General Questions**: "What was...?" → Returns detailed answer
- **Text Queries**: "What text was...?" → Returns exact text content
- **Math Queries**: "What math problem...?" → Returns equation and solution

### 3. Live Streaming

1. Navigate to **"AR Demo"** from homepage
2. Allow camera permissions when prompted
3. The system will:
   - Start recording video chunks (2 seconds each)
   - Analyze every 10 seconds for memory storage
   - Show "Waiting for Arvis..." indicator
4. Say **"hey arvis"** or **"arvis"** to activate
5. Ask your question (e.g., "What's this?")
6. Wait 1 second after speaking (silence detection)
7. View the formatted answer on screen

**Live Stream Features:**
- **Wake Word**: "hey arvis" or "arvis"
- **Silence Detection**: Waits 1 second after you finish speaking
- **Current Frame Capture**: Captures exact moment you ask
- **Memory Integration**: Uses both current video and past memories
- **Session Persistence**: Remembers across restarts

### 4. AR Demo Mode

The AR Demo mode provides a full-screen camera experience:

- **Full-Screen Camera**: Entire screen shows camera feed
- **Text-Only Responses**: No voice output (text overlay)
- **Wake Word Activation**: Say "hey arvis" or "arvis"
- **Well-Formatted Answers**: Markdown-style formatting for readability
- **Current Context**: Prioritizes what you're showing right now
- **Exit Button**: Top-left corner to return home

## 🔧 API Documentation

### Base URL
```
Development: http://localhost:3001
Production: https://your-domain.com
```

### Authentication
Currently, the API uses `userId` in request body for user identification. No authentication tokens required (for development).

### Endpoints

#### `GET /api/health`
Health check endpoint to verify all services are running.

**Response:**
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

#### `POST /api/upload`
Upload video footage for processing.

**Request:**
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `video`: File (required) - Video file (MP4, WebM, etc.)
  - `userId`: String (optional) - User identifier

**Response:**
```json
{
  "success": true,
  "videoId": "507f1f77bcf86cd799439011",
  "message": "Video uploaded and processing started"
}
```

**Error Responses:**
- `400`: No video file provided
- `500`: Processing error

#### `POST /api/query`
Search for objects or answer questions using natural language.

**Request:**
```json
{
  "userId": "user-123",
  "query": "Where did I leave my water bottle?",
  "videoId": "507f1f77bcf86cd799439011" // optional
}
```

**Response:**
```json
{
  "object": "water bottle",
  "queryType": "location",
  "matches": [
    {
      "videoId": "507f1f77bcf86cd799439011",
      "filename": "video.mp4",
      "object": "water bottle",
      "location": "center-right, on desk",
      "timestamp": "00:00:15",
      "confidence": 0.95,
      "uploadedAt": "2025-01-15T10:30:00Z"
    }
  ],
  "bestMatch": {
    "videoId": "507f1f77bcf86cd799439011",
    "location": "center-right, on desk",
    "timestamp": "00:00:15",
    "confidence": 0.95
  },
  "responseText": "I found your water bottle. It was last seen center-right, on desk at 10:30 AM.",
  "voiceAudio": "data:audio/mpeg;base64,..." // if ElevenLabs configured
}
```

**Query Types:**
- **Location Query**: Returns location and timestamp
- **General Question**: Returns detailed answer
- **Text Query**: Returns exact text content
- **Math Query**: Returns equation and solution

#### `GET /api/videos/:userId`
Get all videos for a user.

**Response:**
```json
{
  "videos": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": "user-123",
      "filename": "video.mp4",
      "uploadedAt": "2025-01-15T10:30:00Z",
      "processed": true,
      "objects": [...],
      "activities": [...],
      "people": [...],
      "scenes": [...]
    }
  ]
}
```

#### `GET /api/video/:videoId/questions`
Get questions detected in a video (if any).

**Response:**
```json
{
  "questions": [
    {
      "question": "What is this?",
      "timestamp": "00:00:30",
      "answer": "...",
      "confidence": 0.9
    }
  ]
}
```

#### `POST /api/live-stream/start`
Start a new live streaming session.

**Request:**
```json
{
  "userId": "user-123"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "session-123",
  "message": "Live stream session started"
}
```

#### `POST /api/live-stream/chunk`
Upload a video chunk for live streaming.

**Request:**
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `video`: File (required) - Video chunk (2 seconds)
  - `userId`: String (optional)

**Response:**
```json
{
  "success": true,
  "chunkIndex": 5,
  "chunkCount": 5,
  "shouldAnalyze": true,
  "memorySize": {
    "objects": 12,
    "activities": 3
  }
}
```

**Note**: Analyzes every 5 chunks (10 seconds) for memory storage.

#### `POST /api/live-stream/wake-word`
Notify server that wake word was detected.

**Request:**
```json
{
  "userId": "user-123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ready to listen",
  "listening": true
}
```

#### `POST /api/live-answer`
Answer a question in real-time during live streaming.

**Request:**
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `video`: File (required) - Current video frame or chunk
  - `question`: String (required) - User's question
  - `userId`: String (optional)
  - `timestamp`: Number (optional) - Question timestamp

**Response:**
```json
{
  "answer": "This is a water bottle. It's a blue plastic bottle with a white cap...",
  "question": "What's this?",
  "timestamp": 1234567890,
  "voiceAudio": "data:audio/mpeg;base64,...", // if ElevenLabs configured
  "memoryContext": {
    "objectsFound": 15,
    "activitiesFound": 5
  }
}
```

**Question Types Handled:**
- **Present-Tense**: "What's this?", "What is this?" → Analyzes current video
- **Past-Tense**: "What did I show you?", "What was there?" → Uses memory
- **Math Questions**: "Solve this", "What's the answer?" → Extracts and solves
- **Text Questions**: "What text is this?", "Read this" → Extracts text

#### `POST /api/live-stream/end`
End a live streaming session and optionally save to MongoDB.

**Request:**
```json
{
  "userId": "user-123"
}
```

**Response:**
```json
{
  "success": true,
  "duration": 120,
  "objectsDetected": 25,
  "activitiesDetected": 8
}
```

#### `POST /api/mint-nft`
Mint an NFT for a memorable moment.

**Request:**
```json
{
  "userId": "user-123",
  "memoryData": {
    "object": "water bottle",
    "location": "on desk",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

**Response:**
```json
{
  "success": true,
  "address": "NFT address on Solana",
  "transaction": "transaction signature"
}
```

**Note**: Requires Solana wallet configuration.

## 🎥 Live Streaming

### How It Works

1. **Session Start**: User starts live stream → Creates in-memory session
2. **Chunk Upload**: Frontend sends 2-second video chunks every 2 seconds
3. **Automatic Analysis**: Every 10 seconds (5 chunks), Gemini analyzes for memory
4. **Memory Storage**: Objects, activities, and text stored in session memory
5. **Question Answering**: User asks question → System analyzes current frame + memory
6. **Session End**: Optionally saves session to MongoDB

### Memory Storage

- **Frequency**: Every 10 seconds (5 chunks of 2 seconds each)
- **What's Stored**:
  - Objects with full details (brand, flavor, text, etc.)
  - Activities happening
  - **All visible text** (word-for-word)
  - Math problems and equations
  - Timestamps and locations
- **Retention**: Last 20 minutes of memory kept in session
- **Persistence**: Can be saved to MongoDB when session ends

### Wake Word Detection

- **Wake Words**: "hey arvis" or "arvis"
- **Activation**: Starts listening for questions
- **Timeout**: Stops listening after 10 seconds of no speech
- **Silence Detection**: Waits 1 second after user finishes speaking before processing

### Question Processing

1. **Wake Word Detected** → System ready to listen
2. **User Speaks Question** → Captured by speech recognition
3. **1 Second Silence** → Question processing begins
4. **Current Frame Capture** → Screenshot of current video
5. **Memory Context** → Loads recent session memory
6. **Gemini Analysis** → Analyzes current frame + memory
7. **Response Display** → Formatted answer shown on screen

## 🚀 Deployment

### Vultr Deployment

#### 1. Create Vultr Instance

1. Sign up at [Vultr](https://www.vultr.com)
2. Create new instance:
   - **OS**: Ubuntu 22.04 LTS
   - **Plan**: Minimum 2GB RAM, 1 vCPU
   - **Region**: Choose closest to users
3. Note the IP address

#### 2. Initial Server Setup

```bash
# SSH into server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2
npm install -g pm2

# Install Nginx
apt install -y nginx
```

#### 3. Deploy Application

```bash
# Clone repository
git clone <your-repo-url>
cd ARVS-Augmented-Recall-Vision-Systems-2

# Install dependencies
npm install
cd server && npm install && cd ..

# Build frontend
npm run build

# Configure environment
# Edit server/index.js with production API keys
# Or create server/.env file
```

#### 4. Configure PM2

```bash
# Start backend with PM2
cd server
pm2 start index.js --name memoryglass-api
pm2 save
pm2 startup
```

#### 5. Configure Nginx

Create `/etc/nginx/sites-available/memoryglass`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend
    location / {
        root /path/to/ARVS-Augmented-Recall-Vision-Systems-2/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

Enable site:
```bash
ln -s /etc/nginx/sites-available/memoryglass /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

#### 6. SSL with Let's Encrypt

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

### Environment Variables in Production

Update `server/index.js` with production API keys, or use environment variables:

```bash
# Set environment variables
export GEMINI_API_KEY=your_production_key
export MONGODB_URI=your_production_uri

# Or use PM2 ecosystem file
```

## 🔐 Security

### Current Security Measures

- **CORS**: Enabled for development (configure for production)
- **File Upload Limits**: 500MB maximum file size
- **Rate Limiting**: 
  - Live answers: 10 questions per 30 seconds
  - Query caching: 30-minute TTL
- **Input Validation**: File type and size validation
- **Error Handling**: Comprehensive error handling and logging

### Security Recommendations

1. **Authentication**: Implement user authentication (JWT, OAuth, etc.)
2. **HTTPS**: Always use HTTPS in production
3. **API Keys**: Store in environment variables, not in code
4. **Rate Limiting**: Implement stricter rate limiting
5. **Input Sanitization**: Sanitize all user inputs
6. **Video Access Control**: Implement video access permissions
7. **Database Security**: Use MongoDB Atlas IP whitelisting
8. **Secrets Management**: Use secrets management service (AWS Secrets Manager, etc.)

## ⚡ Performance

### Optimizations

1. **Query Caching**: 30-minute TTL reduces duplicate API calls by 50-70%
2. **Chunk Throttling**: Analyzes every 10 seconds (not every chunk)
3. **Request Queue**: Global queue prevents concurrent Gemini API calls
4. **Memory Management**: Keeps only last 20 minutes of session memory
5. **Lazy Loading**: Frontend components load on demand

### API Call Frequency

- **Video Upload**: 1-2 Gemini calls per video
- **Query**: 0-1 Gemini calls (cached if possible)
- **Live Stream**: 1 Gemini call every 10 seconds
- **Live Answer**: 1-2 Gemini calls per question

### Performance Metrics

- **Video Processing**: ~10-30 seconds per minute of video
- **Query Response**: <2 seconds (with cache), <5 seconds (without cache)
- **Live Answer**: <3 seconds for response
- **Memory Storage**: <1 second per chunk analysis

## 🐛 Troubleshooting

### Common Issues

#### 1. "Gemini AI not initialized"
**Cause**: Invalid or missing API key
**Solution**: 
- Check `server/index.js` line 17 for correct API key
- Verify key is valid at [Google AI Studio](https://makersuite.google.com/app/apikey)
- Check console logs for key being used

#### 2. "MongoDB connection error"
**Cause**: Invalid connection string or network issue
**Solution**:
- Verify MongoDB Atlas connection string
- Check IP whitelist in MongoDB Atlas
- Test connection: `node server/test-connections.js`

#### 3. "Rate limited by Gemini"
**Cause**: Too many API calls
**Solution**:
- Wait a few minutes
- Check API usage in Google AI Studio
- System has built-in rate limiting (5 seconds between requests)

#### 4. "Video processing failed"
**Cause**: Invalid video format or corrupted file
**Solution**:
- Use MP4 or WebM format
- Check file size (max 500MB)
- Verify video file is not corrupted

#### 5. "Wake word not working"
**Cause**: Browser permissions or microphone access
**Solution**:
- Allow microphone permissions
- Use Chrome or Edge (best Web Speech API support)
- Check browser console for errors

#### 6. "Live answer not working"
**Cause**: Video capture or API error
**Solution**:
- Check camera permissions
- Verify Gemini API key is valid
- Check browser console for errors
- Try asking a different question

### Debug Mode

Enable detailed logging:
```javascript
// In server/index.js, add:
console.log('Debug mode enabled');
```

Check logs:
- **Backend**: Terminal running `npm run dev` in `server/`
- **Frontend**: Browser console (F12)

## 💻 Development

### Project Structure

```
ARVS-Augmented-Recall-Vision-Systems-2/
├── server/                 # Backend code
│   ├── index.js           # Main server file
│   ├── package.json       # Backend dependencies
│   ├── uploads/           # Video uploads (gitignored)
│   └── test-connections.js # Connection testing
├── src/                    # Frontend code
│   ├── components/        # React components
│   │   ├── LiveStream.tsx
│   │   └── LiveStreamSpeakingView.tsx
│   ├── pages/            # Page components
│   │   ├── Index.tsx
│   │   └── Dashboard.tsx
│   └── App.tsx           # Root component
├── public/                # Static assets
├── package.json          # Frontend dependencies
└── README.md            # This file
```

### Development Workflow

1. **Make Changes**: Edit code in `src/` or `server/`
2. **Test Locally**: Run `npm run dev` (frontend) and `cd server && npm run dev` (backend)
3. **Check Logs**: Monitor console for errors
4. **Test Features**: Upload video, search, test live stream
5. **Commit**: `git add . && git commit -m "Description"`
6. **Deploy**: Push to repository, pull on server, restart PM2

### Code Style

- **Frontend**: TypeScript with React functional components
- **Backend**: ES6+ JavaScript with Express
- **Naming**: camelCase for variables, PascalCase for components
- **Comments**: JSDoc comments for functions

### Testing

```bash
# Test API connections
cd server
node test-connections.js

# Test health endpoint
curl http://localhost:3001/api/health

# Test upload (with file)
curl -X POST -F "video=@test.mp4" -F "userId=test" http://localhost:3001/api/upload
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly
5. Commit: `git commit -m "Add amazing feature"`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Contribution Guidelines

- Follow existing code style
- Add comments for complex logic
- Update documentation if needed
- Test your changes before submitting
- Keep commits focused and descriptive

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- **Built for**: AI ATL Hackathon 2025
- **Powered by**: Google Gemini AI
- **Blockchain**: Solana
- **Voice**: ElevenLabs
- **Database**: MongoDB Atlas
- **Analytics**: Snowflake

## 📧 Support

For issues or questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review documentation in `/docs` folder

## 🔗 Additional Resources

- [Quick Start Guide](./QUICK_START.md)
- [Tech Stack Details](./TECH_STACK.md)
- [API Calls Reference](./API_CALLS.md)
- [Gemini API Frequency](./GEMINI_FREQUENCY.md)

---

**Built with ❤️ for the future of spatial computing**

*MemoryGlass - Never forget where you left anything.*
