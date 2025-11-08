#!/bin/bash

echo "========================================"
echo "Vectorized Recall System - Setup Script"
echo "========================================"
echo ""

echo "Step 1: Installing dependencies..."
cd server
npm install @xenova/transformers fluent-ffmpeg ffmpeg-static

if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Failed to install dependencies"
    echo "Please make sure Node.js and npm are installed"
    echo "Install from: https://nodejs.org/"
    exit 1
fi

echo ""
echo "✅ Dependencies installed successfully!"
echo ""
echo "========================================"
echo "IMPORTANT: MongoDB Vector Search Index"
echo "========================================"
echo ""
echo "The code is ready, but you MUST create a vector search index in MongoDB Atlas:"
echo ""
echo "1. Go to: https://cloud.mongodb.com"
echo "2. Navigate to your cluster → Search → Create Search Index"
echo "3. Choose 'JSON Editor'"
echo "4. Database: memoryglass"
echo "5. Collection: video_embeddings"
echo "6. Index Name: vector_index"
echo "7. Paste this JSON:"
echo ""
cat << 'EOF'
{
  "name": "vector_index",
  "type": "vectorSearch",
  "definition": {
    "fields": [
      {
        "type": "vector",
        "path": "embedding",
        "numDimensions": 512,
        "similarity": "cosine"
      }
    ]
  }
}
EOF
echo ""
echo "8. Click 'Create Search Index' and wait for it to become 'Active'"
echo ""
echo "See VECTOR_SETUP_INSTRUCTIONS.md for detailed instructions."
echo ""
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Create MongoDB vector search index (see above)"
echo "2. Start your server: cd server && npm run dev"
echo "3. Upload a test video"
echo "4. Try a query like 'Where did I leave my water bottle?'"
echo ""


