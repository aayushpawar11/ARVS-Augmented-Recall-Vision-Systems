#!/bin/bash

# Start Backend Server Script
# This script starts the backend server for the ARVS project

echo "🚀 Starting ARVS Backend Server..."
echo ""

cd "$(dirname "$0")/server"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "🔧 Starting server on port 3001..."
echo "📡 WebSocket will be available at ws://localhost:3001/api/live-vision"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm start

