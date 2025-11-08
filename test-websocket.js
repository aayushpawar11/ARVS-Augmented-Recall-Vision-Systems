#!/usr/bin/env node

/**
 * WebSocket Connection Test Script
 * Run this to test if the WebSocket server is working
 * Usage: node test-websocket.js
 */

import WebSocket from 'ws';

const WS_URL = process.env.WS_URL || 'ws://localhost:3001/api/live-vision';

console.log('🧪 Testing WebSocket connection...');
console.log('📡 URL:', WS_URL);

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ WebSocket connected successfully!');
  console.log('📤 Sending test message...');
  
  // Send a test frame (minimal base64 image)
  const testFrame = {
    type: 'frame',
    frame: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A', // 1x1 pixel JPEG
    query: 'What do you see?',
    userId: 'test-user'
  };
  
  ws.send(JSON.stringify(testFrame));
});

ws.on('message', (data) => {
  console.log('📨 Message received:', data.toString());
  try {
    const parsed = JSON.parse(data.toString());
    console.log('📦 Parsed message:', parsed);
  } catch (e) {
    console.log('📦 Raw message:', data.toString());
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  console.error('❌ Error details:', error);
  process.exit(1);
});

ws.on('close', (code, reason) => {
  console.log('🔌 WebSocket closed');
  console.log('📊 Close code:', code);
  console.log('📊 Close reason:', reason.toString());
  process.exit(code === 1000 ? 0 : 1);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('⏱️ Test timeout - closing connection');
  ws.close();
  process.exit(1);
}, 10000);

