# MemoryGlass - AI Spatial Memory for Smart Glasses

Never forget where you left anything. MemoryGlass is an AI-powered spatial memory system for smart glasses that records your visual experiences and lets you search for objects using natural language queries.

## 🌟 Features

- **Continuous Video Recording**: Capture everything you see through smart glasses
- **AI-Powered Object Detection**: Gemini Vision AI identifies and tracks objects in real-time
- **Natural Language Search**: Ask "Where did I leave my water bottle?" and get instant answers
- **Voice Responses**: ElevenLabs integration for natural voice feedback
- **Blockchain Integration**: Solana-based tokenized interactions and NFT memories
- **Analytics**: Snowflake integration for data warehousing and insights
- **Cloud Hosting**: Deployed on Vultr for scalable performance

## 🛠️ Tech Stack

- **Web Frontend**: React + TypeScript + Vite + shadcn-ui
- **Mobile App**: Expo + React Native + TypeScript
- **Backend**: Node.js + Express
- **AI/ML**: 
  - Gemini 2.0 Flash (Vision AI & Natural Language Understanding)
  - ElevenLabs (Voice Generation)
- **Database**: MongoDB Atlas (Real-time data storage)
- **Blockchain**: Solana (NFTs & Tokenized Interactions)
- **Analytics**: Snowflake API (Data Warehousing)
- **Hosting**: Vultr (Cloud Infrastructure)
- **Domain**: .Tech domain support

## 📁 Project Structure (Monorepo)

```
ARVS-Augmented-Recall-Vision-Systems/
├── server/          # Backend API (Node.js + Express)
├── web/             # Web frontend (React + Vite)
├── mobile/          # Mobile app (Expo + React Native)
├── shared/          # Shared TypeScript code (API client, types, utils)
└── package.json     # Root workspace configuration
```

This is an npm workspaces monorepo, allowing shared code between web and mobile apps.

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x or higher
- npm or yarn
- MongoDB Atlas account (or local MongoDB)
- API Keys for:
  - Google Gemini API
  - ElevenLabs
  - Solana RPC (or use public endpoint)
  - Snowflake (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd ARVS-Augmented-Recall-Vision-Systems
   ```

2. **Install all dependencies** (from root - installs for all workspaces)
   ```bash
   npm install
   ```

   This will install dependencies for:
   - `server/` - Backend API
   - `web/` - Web frontend
   - `mobile/` - Mobile app
   - `shared/` - Shared TypeScript code

3. **Setup environment variables**
   ```bash
   bash create-env.sh
   ```

   This creates `server/.env` with all required API keys.

### Running the Application

**Start backend server:**
```bash
npm run dev:server
# or
cd server && npm run dev
```

**Start web frontend:**
```bash
npm run dev:web
# or
cd web && npm run dev
```

**Start mobile app:**
```bash
npm run dev:mobile
# or
cd mobile && npm start
```

See [MOBILE_SETUP.md](./MOBILE_SETUP.md) for detailed mobile app setup instructions.

6. **Open your browser**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:3001

## 📖 Usage

### 1. Upload Video Footage

1. Navigate to the Dashboard (`/dashboard`)
2. Click "Upload Video" tab
3. Select a video file from your smart glasses
4. Wait for processing (Gemini AI will analyze the video)

### 2. Search for Objects

1. Go to "Search Memories" tab
2. Type or speak your query (e.g., "Where did I leave my water bottle?")
3. Get instant results with:
   - Object location
   - Timestamp
   - Video reference
   - Voice response (via ElevenLabs)

### 3. View Results

Results show:
- Best match with highest confidence
- All matches with location and timestamp
- Visual proof from video frames
- Audio playback of the answer

## 🏗️ Architecture

```
┌─────────────────┐
│  Smart Glasses  │
│   (Video Feed)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Frontend App   │
│  (React/TS)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend API    │
│  (Express.js)   │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────┬──────────┐
    ▼         ▼          ▼          ▼          ▼
┌────────┐ ┌──────┐ ┌─────────┐ ┌────────┐ ┌──────────┐
│ Gemini │ │MongoDB│ │Solana  │ │ElevenLabs│ │Snowflake│
│   AI   │ │ Atlas │ │Blockchain│ │  Voice │ │Analytics │
└────────┘ └──────┘ └─────────┘ └────────┘ └──────────┘
```

## 🔧 API Endpoints

### `POST /api/upload`
Upload video footage for processing
- **Body**: `FormData` with `video` file and `userId`
- **Response**: `{ success: true, videoId: string }`

### `POST /api/query`
Search for objects using natural language
- **Body**: `{ userId: string, query: string }`
- **Response**: `{ object: string, matches: [...], bestMatch: {...}, responseText: string, voiceAudio: string }`

### `GET /api/videos/:userId`
Get all videos for a user
- **Response**: `{ videos: [...] }`

### `POST /api/mint-nft`
Mint an NFT for a memorable moment
- **Body**: `{ userId: string, memoryData: object }`
- **Response**: `{ success: true, address: string }`

### `GET /api/health`
Health check endpoint
- **Response**: `{ status: 'ok', services: {...} }`

## 🌐 Deployment on Vultr

1. **Create a Vultr instance**
   - Choose Ubuntu 22.04 LTS
   - Minimum: 2GB RAM, 1 vCPU

2. **Run deployment script**
   ```bash
   chmod +x vultr-deploy.sh
   ./vultr-deploy.sh
   ```

3. **Configure domain**
   - Point your `.tech` domain to Vultr IP
   - Update Nginx config with your domain
   - Set up SSL with Let's Encrypt

4. **Set environment variables**
   - Add `.env` file in `/var/www/memoryglass/server/`
   - Restart PM2: `pm2 restart memoryglass-api`

## 🔐 Security Considerations

- Store API keys securely (use environment variables)
- Implement user authentication
- Add rate limiting to API endpoints
- Use HTTPS in production
- Encrypt sensitive data in MongoDB
- Implement video access controls

## 📊 Analytics with Snowflake

The system automatically sends analytics events to Snowflake:
- `video_processed`: When a video is analyzed
- `object_query`: When a user searches for an object

Query Snowflake to get insights:
- Most searched objects
- Peak usage times
- User behavior patterns
- System performance metrics

## 🎨 Customization

### Change Voice (ElevenLabs)
Update `ELEVENLABS_VOICE_ID` in `.env` with your preferred voice ID.

### Solana Network
Switch between mainnet/devnet by changing `SOLANA_RPC_URL`:
- Mainnet: `https://api.mainnet-beta.solana.com`
- Devnet: `https://api.devnet.solana.com`

### Gemini Model
Change the model in `server/index.js`:
- `gemini-2.0-flash-exp` (current)
- `gemini-1.5-pro`
- `gemini-1.5-flash`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Built for AI ATL Hackathon 2025
- Powered by Google Gemini AI
- Blockchain integration via Solana
- Voice synthesis by ElevenLabs

## 📧 Support

For issues or questions, please open an issue on GitHub.

---

**Built with ❤️ for the future of spatial computing**
