# Technology Integration Guide

This document explains how each technology is integrated into MemoryGlass.

## 🤖 Gemini API (Google)

**Purpose**: AI reasoning, vision analysis, and natural language understanding

**Integration Points**:
- **Video Analysis**: `server/index.js` - `processVideoWithGemini()` function
  - Analyzes uploaded video frames
  - Extracts objects, locations, and timestamps
  - Uses `gemini-2.0-flash-exp` model for vision tasks

- **Query Understanding**: `server/index.js` - `queryObjects()` function
  - Processes natural language queries
  - Searches through video metadata
  - Returns structured results with confidence scores

**Setup**:
1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add to `server/.env`: `GEMINI_API_KEY=your_key_here`

## 🔗 Solana Blockchain

**Purpose**: Tokenized interactions and NFT minting for memorable moments

**Integration Points**:
- **NFT Minting**: `server/index.js` - `mintMemoryNFT()` function
  - Mints NFTs for significant memories
  - Stores metadata in MongoDB
  - Uses Solana Web3.js for transactions

**Setup**:
1. Create Solana wallet or use existing
2. Add to `server/.env`:
   - `SOLANA_RPC_URL=https://api.mainnet-beta.solana.com` (or devnet)
   - `SOLANA_WALLET_SECRET=[...]` (wallet private key as JSON array)
   - `SOLANA_TREASURY=your_treasury_address`

**Usage**:
- Call `/api/mint-nft` endpoint with memory data
- NFTs represent tokenized memories on-chain

## ☁️ Vultr (Cloud Hosting)

**Purpose**: Scalable cloud deployment

**Integration**:
- Deployment script: `vultr-deploy.sh`
- Configures Nginx reverse proxy
- Sets up PM2 for process management
- Supports SSL with Let's Encrypt

**Deployment Steps**:
1. Create Vultr instance (Ubuntu 22.04)
2. Run `./vultr-deploy.sh`
3. Configure domain DNS
4. Set up SSL certificate

## 📊 Snowflake API

**Purpose**: Data analytics and warehousing

**Integration Points**:
- **Analytics Tracking**: `server/index.js` - `sendToSnowflake()` function
  - Tracks video processing events
  - Logs user queries
  - Stores usage analytics

**Events Tracked**:
- `video_processed`: When videos are analyzed
- `object_query`: When users search for objects

**Setup**:
1. Create Snowflake account
2. Set up API endpoint
3. Add to `server/.env`:
   - `SNOWFLAKE_API_URL=https://your-account.snowflakecomputing.com/api/v1/statements`
   - `SNOWFLAKE_API_KEY=your_api_key`

**Querying Analytics**:
```sql
SELECT * FROM memoryglass_analytics 
WHERE event = 'object_query' 
ORDER BY timestamp DESC;
```

## 🎙️ ElevenLabs (Voice Generation)

**Purpose**: Natural voice responses to user queries

**Integration Points**:
- **Voice Synthesis**: `server/index.js` - `generateVoiceResponse()` function
  - Converts text responses to speech
  - Returns base64-encoded audio
  - Uses multilingual model

**Setup**:
1. Get API key from [ElevenLabs](https://elevenlabs.io)
2. Add to `server/.env`:
   - `ELEVENLABS_API_KEY=your_api_key`
   - `ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM` (or choose your voice)

**Usage**:
- Automatically generates voice responses for query results
- Frontend plays audio via HTML5 Audio API

## 🗄️ MongoDB Atlas

**Purpose**: Real-time data storage and retrieval

**Integration Points**:
- **Video Storage**: Stores video metadata and object detections
- **NFT Metadata**: Stores NFT information linked to memories
- **User Data**: Tracks user videos and queries

**Collections**:
- `videos`: Video metadata and detected objects
- `nfts`: NFT minting records
- `users`: User profiles (future)

**Setup**:
1. Create MongoDB Atlas cluster
2. Get connection string
3. Add to `server/.env`:
   - `MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/memoryglass`

**Schema Example**:
```javascript
{
  userId: "user-1",
  videoPath: "/uploads/video-123.mp4",
  uploadedAt: ISODate("2025-01-XX"),
  objects: [
    {
      object: "water bottle",
      timestamp: "00:00:15",
      location: "center-right, on desk",
      confidence: 0.95
    }
  ]
}
```

## 🌐 .Tech Domain

**Purpose**: Modern, tech-forward branding

**Integration**:
- Configure in Vultr deployment
- Update Nginx config with domain name
- Set up DNS records pointing to Vultr IP

**Example**:
- Domain: `memoryglass.tech`
- DNS A record: Points to Vultr server IP
- SSL: Let's Encrypt certificate

## 🔄 Data Flow

```
Smart Glasses Video
    ↓
Frontend Upload Component
    ↓
Backend API (/api/upload)
    ↓
Gemini Vision AI (Object Detection)
    ↓
MongoDB Atlas (Storage)
    ↓
Snowflake (Analytics)
    ↓
User Query (/api/query)
    ↓
Gemini AI (Natural Language Understanding)
    ↓
MongoDB (Search)
    ↓
ElevenLabs (Voice Response)
    ↓
Frontend Display + Audio
```

## 🎯 Key Features by Technology

| Technology | Feature | Status |
|------------|---------|--------|
| Gemini AI | Video analysis & query understanding | ✅ Implemented |
| MongoDB Atlas | Data persistence | ✅ Implemented |
| ElevenLabs | Voice responses | ✅ Implemented |
| Solana | NFT minting | ✅ Implemented |
| Snowflake | Analytics tracking | ✅ Implemented |
| Vultr | Cloud hosting | ✅ Deployment script ready |
| .Tech Domain | Branding | ⚙️ Configure on deployment |

## 📝 Environment Variables Summary

All required environment variables for `server/.env`:

```env
# Required
GEMINI_API_KEY=...
MONGODB_URI=...

# Optional but recommended
ELEVENLABS_API_KEY=...
SOLANA_RPC_URL=...
SOLANA_WALLET_SECRET=...
SNOWFLAKE_API_URL=...
SNOWFLAKE_API_KEY=...
```

## 🚀 Quick Start

1. Run `./setup.sh` to install dependencies
2. Configure `server/.env` with your API keys
3. Start backend: `cd server && npm run dev`
4. Start frontend: `npm run dev`
5. Visit http://localhost:8080

---

For detailed setup instructions, see [README.md](./README.md)

