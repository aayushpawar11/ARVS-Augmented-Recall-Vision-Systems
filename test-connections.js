// Quick test script to verify API connections
import { config } from 'dotenv';
import { MongoClient } from 'mongodb';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

config({ path: './server/.env' });

async function testConnections() {
  console.log('🧪 Testing API Connections...\n');

  // Test MongoDB
  console.log('1. Testing MongoDB Atlas...');
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    await client.db('memoryglass').admin().ping();
    console.log('   ✅ MongoDB Atlas: Connected\n');
    await client.close();
  } catch (error) {
    console.log('   ❌ MongoDB Atlas: Failed -', error.message, '\n');
  }

  // Test Gemini
  console.log('2. Testing Gemini AI...');
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent('Say "Hello" if you can read this.');
    const response = await result.response;
    console.log('   ✅ Gemini AI: Connected -', response.text().substring(0, 50), '\n');
  } catch (error) {
    console.log('   ❌ Gemini AI: Failed -', error.message);
    if (error.message.includes('API_KEY')) {
      console.log('   ⚠️  The API key may be invalid. Get a new one from: https://makersuite.google.com/app/apikey\n');
    } else {
      console.log('');
    }
  }

  // Test ElevenLabs
  console.log('3. Testing ElevenLabs...');
  try {
    const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      }
    });
    console.log('   ✅ ElevenLabs: Connected -', response.data.voices?.length || 0, 'voices available\n');
  } catch (error) {
    console.log('   ❌ ElevenLabs: Failed -', error.response?.data?.detail?.message || error.message, '\n');
  }

  // Test Snowflake (basic check)
  console.log('4. Testing Snowflake...');
  if (process.env.SNOWFLAKE_API_KEY && process.env.SNOWFLAKE_API_URL.includes('snowflakecomputing.com')) {
    console.log('   ✅ Snowflake: Configuration present (URL needs account ID)\n');
  } else {
    console.log('   ⚠️  Snowflake: Update SNOWFLAKE_API_URL with your account ID\n');
  }

  console.log('✨ Connection tests complete!');
}

testConnections().catch(console.error);

