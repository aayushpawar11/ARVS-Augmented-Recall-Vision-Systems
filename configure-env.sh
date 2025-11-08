#!/bin/bash

# Configure .env file with provided credentials

cat > server/.env << 'EOF'
# Gemini API
GEMINI_API_KEY=gen-lang-client-0463356026

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
EOF

echo "✅ .env file created in server/.env"
echo ""
echo "⚠️  Note: The Gemini API key provided looks like a client ID."
echo "   You may need to get the actual API key from: https://makersuite.google.com/app/apikey"
echo "   The API key usually starts with 'AIza' and is longer."
echo ""
echo "⚠️  Note: Update SNOWFLAKE_API_URL with your actual Snowflake account URL"
echo "   Format: https://<account-id>.snowflakecomputing.com/api/v1/statements"

