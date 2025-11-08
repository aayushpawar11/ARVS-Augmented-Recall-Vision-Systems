# Live Streaming Feature - API Cost Optimization

## Overview
The live streaming feature allows real-time question answering while recording, optimized to minimize API costs and latency.

## Cost Optimization Strategies

### 1. **On-Demand Analysis Only**
- ✅ Only calls Gemini API when a question is detected
- ✅ Uses free Web Speech API for transcription (client-side)
- ✅ No continuous video analysis - only when needed

### 2. **Efficient Video Chunking**
- Records video in 3-second chunks
- Only analyzes the last 3 chunks (~6-9 seconds) when answering
- Keeps memory usage low (max 10 chunks in memory)

### 3. **Smart Question Detection**
- Client-side question detection using Web Speech API (FREE)
- Only sends to server when question is confirmed
- Debouncing prevents duplicate questions

### 4. **Optimized Prompts**
- Short, focused prompts for faster responses
- Requests concise answers (2-3 sentences max)
- Uses `gemini-2.0-flash-exp` (faster, cheaper model)

### 5. **Caching & Rate Limiting**
- Questions are cached to avoid re-answering
- Rate limiting prevents API spam
- Video chunks are cleaned up immediately after processing

## API Usage Estimate

**Per Question:**
- 1 Gemini API call (video analysis + answer)
- ~1-3 seconds of video analyzed
- Estimated cost: ~$0.001-0.003 per question

**For 1 hour of streaming:**
- Assuming 10 questions/hour: ~$0.01-0.03
- Very cost-effective!

## How It Works

1. **User starts live stream**
   - Camera and microphone access requested
   - Web Speech API starts transcribing (FREE, client-side)
   - MediaRecorder captures video in 3-second chunks

2. **User asks a question**
   - Web Speech API detects question pattern
   - Question is extracted and displayed
   - Last 3 video chunks sent to server

3. **Server processes question**
   - Only analyzes the recent video chunk (~6-9 seconds)
   - Gemini generates answer
   - ElevenLabs generates voice response (optional)

4. **Answer displayed**
   - Answer appears in real-time
   - Voice response plays automatically

## Browser Compatibility

**Required:**
- Modern browser with WebRTC support
- Web Speech API support (Chrome, Edge, Safari)
- MediaRecorder API support

**Not Supported:**
- Firefox (limited Web Speech API support)
- Older browsers

## Performance Tips

1. **Reduce video quality** if needed:
   ```javascript
   video: { width: 640, height: 480 } // Lower resolution
   ```

2. **Increase chunk duration** for fewer API calls:
   ```javascript
   mediaRecorder.start(5000); // 5-second chunks
   ```

3. **Disable voice responses** to save ElevenLabs credits:
   - Remove `voiceAudio` generation in backend

## Monitoring API Usage

Check your API usage:
- **Gemini**: Google AI Studio dashboard
- **ElevenLabs**: ElevenLabs dashboard
- **MongoDB**: Atlas dashboard

## Troubleshooting

**"Speech recognition not supported"**
- Use Chrome, Edge, or Safari
- Ensure microphone permissions granted

**"Failed to start stream"**
- Check camera/microphone permissions
- Try different browser
- Check HTTPS (required for getUserMedia)

**High API costs?**
- Reduce question frequency
- Use lower video quality
- Disable voice responses
- Increase chunk duration

## Future Optimizations

1. **Local processing** - Use WebAssembly for initial analysis
2. **Question deduplication** - Avoid answering similar questions
3. **Smart caching** - Cache answers for similar contexts
4. **Batch processing** - Group multiple questions together

