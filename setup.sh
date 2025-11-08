#!/bin/bash

# MemoryGlass Setup Script
# This script helps set up the development environment

echo "🚀 Setting up MemoryGlass..."

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20.x or higher."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version 20 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Install backend dependencies
if [ -d "server" ]; then
    echo "📦 Installing backend dependencies..."
    cd server
    npm install
    cd ..
else
    echo "⚠️  Server directory not found. Creating it..."
    mkdir -p server
fi

# Create .env file if it doesn't exist
if [ ! -f "server/.env" ]; then
    echo "📝 Creating .env file template..."
    cat > server/.env << EOF
# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/memoryglass?retryWrites=true&w=majority

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_WALLET_SECRET=[]
SOLANA_TREASURY=your_treasury_wallet_address

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Snowflake
SNOWFLAKE_API_URL=https://your-account.snowflakecomputing.com/api/v1/statements
SNOWFLAKE_API_KEY=your_snowflake_api_key

# Server
PORT=3001
EOF
    echo "⚠️  Please update server/.env with your API keys"
else
    echo "✅ .env file already exists"
fi

# Create uploads directory
mkdir -p server/uploads

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update server/.env with your API keys"
echo "2. Start the backend: cd server && npm run dev"
echo "3. Start the frontend: npm run dev"
echo ""
echo "🌐 Frontend will run on http://localhost:8080"
echo "🔧 Backend will run on http://localhost:3001"

