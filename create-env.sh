#!/bin/bash

# Create .env file with all configured credentials

cat > server/.env << 'EOF'
# Gemini API
GEMINI_API_KEY=AIzaSyANnYB6DhWB4HR8rpfkkYWo9v2chsJHMd8

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
SNOWFLAKE_API_URL=https://aayushpawar4455_db_user.snowflakecomputing.com/api/v1/statements
SNOWFLAKE_API_KEY=eyJraWQiOiI5NjA1OTAyMzQxIiwiYWxnIjoiRVMyNTYifQ.eyJwIjoiMzc1MjI5NDg6Mzc1MjI5NDgiLCJpc3MiOiJTRjozMDA0IiwiZXhwIjoxNzYzODczOTMxfQ.d7cVs5vkYgc3wjCYJnpaCgGOCzfTLwYbSk7MA0_2X0WD_d7o0TCz4jQsqegFQIbnZ-QlYlg0avg_TQ5OMPppCg

# Server
PORT=3001
EOF

echo "✅ .env file created successfully in server/.env"
echo ""
echo "📋 Configured services:"
echo "   ✅ Gemini AI (API key set)"
echo "   ✅ MongoDB Atlas (connection string set)"
echo "   ✅ ElevenLabs (API key set)"
echo "   ✅ Snowflake (token set, update URL with account ID)"
echo "   ✅ Solana (public RPC configured)"
echo ""
echo "⚠️  Note: Update SNOWFLAKE_API_URL with your actual account ID"
echo "   Format: https://<account-id>.snowflakecomputing.com/api/v1/statements"

