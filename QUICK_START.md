# 🚀 Quick Start Guide

## Step 1: Create Environment File

Create a file named `.env` in the `server/` directory with the following content:

```env
# Gemini API
GEMINI_API_KEY=AIzaSyBm_KUwEOD5Nnq9yv0rSAN55hPfg1Croso

# MongoDB Atlas
MONGODB_URI=mongodb+srv://aayushpawar4455_db_user:M6WAZoNssgsP8x9U@cluster0.4ma2dmi.mongodb.net/memoryglass?retryWrites=true&w=majority

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_WALLET_SECRET=[]
SOLANA_TREASURY=

# ElevenLabs
ELEVENLABS_API_KEY=sk_c4fe8add6ab7278103ad2e42b1023dfa5717c8282ed5b219
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Snowflake
SNOWFLAKE_API_URL=https://your-account.snowflakecomputing.com/api/v1/statements
SNOWFLAKE_API_KEY=eyJraWQiOiI5NjA1OTAyMzQxIiwiYWxnIjoiRVMyNTYifQ.eyJwIjoiMzc1MjI5NDg6Mzc1MjI5NDgiLCJpc3MiOiJTRjozMDA0IiwiZXhwIjoxNzYzODczOTMxfQ.d7cVs5vkYgc3wjCYJnpaCgGOCzfTLwYbSk7MA0_2X0WD_d7o0TCz4jQsqegFQIbnZ-QlYlg0avg_TQ5OMPppCg

# Server
PORT=3001
```

**Quick command to create it:**
```bash
cat > server/.env << 'EOF'
GEMINI_API_KEY=AIzaSyBm_KUwEOD5Nnq9yv0rSAN55hPfg1Croso
MONGODB_URI=mongodb+srv://aayushpawar4455_db_user:M6WAZoNssgsP8x9U@cluster0.4ma2dmi.mongodb.net/memoryglass?retryWrites=true&w=majority
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_WALLET_SECRET=[]
SOLANA_TREASURY=
ELEVENLABS_API_KEY=sk_c4fe8add6ab7278103ad2e42b1023dfa5717c8282ed5b219
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
SNOWFLAKE_API_URL=https://your-account.snowflakecomputing.com/api/v1/statements
SNOWFLAKE_API_KEY=eyJraWQiOiI5NjA1OTAyMzQxIiwiYWxnIjoiRVMyNTYifQ.eyJwIjoiMzc1MjI5NDg6Mzc1MjI5NDgiLCJpc3MiOiJTRjozMDA0IiwiZXhwIjoxNzYzODczOTMxfQ.d7cVs5vkYgc3wjCYJnpaCgGOCzfTLwYbSk7MA0_2X0WD_d7o0TCz4jQsqegFQIbnZ-QlYlg0avg_TQ5OMPppCg
PORT=3001
EOF
```

## Step 2: Install Dependencies

Backend dependencies are already installed. If you need to reinstall:

```bash
cd server
npm install
cd ..
```

Frontend dependencies:
```bash
npm install
```

## Step 3: Start the Servers

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

## Step 4: Open the App

- Frontend: http://localhost:8080
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/api/health

## ⚠️ Important Notes

1. **Gemini API Key**: ✅ Configured with valid API key

2. **Snowflake URL**: Update `SNOWFLAKE_API_URL` with your actual account identifier (replace `your-account` with your Snowflake account ID)

3. **MongoDB**: The connection string is configured with database name `memoryglass`. Collections will be created automatically.

## 🧪 Test Your Setup

Run the connection test:
```bash
node test-connections.js
```

This will verify all your API connections are working.

## 🎯 Next Steps

1. Upload a test video from the Dashboard
2. Try searching: "Where did I leave my water bottle?"
3. Check the console for any errors
4. View results with location and timestamp

---

**Need help?** See README.md or SETUP_COMPLETE.md for more details.

