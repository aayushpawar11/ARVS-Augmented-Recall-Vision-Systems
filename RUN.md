# 🚀 How to Run MemoryGlass

## Step 1: Open Two Terminal Windows

You'll need **2 separate terminal windows** - one for the backend, one for the frontend.

## Step 2: Start the Backend Server

In **Terminal 1**, run:

```bash
cd /Users/aayushpawar/Desktop/Aayush_Pawar/projects/chrono-weave-sol/server
npm run dev
```

You should see:
```
✅ Connected to MongoDB Atlas
✅ Gemini AI initialized
✅ Solana connection initialized
🚀 MemoryGlass API server running on port 3001
```

## Step 3: Start the Frontend

In **Terminal 2**, run:

```bash
cd /Users/aayushpawar/Desktop/Aayush_Pawar/projects/chrono-weave-sol
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:8080/
  ➜  Network: use --host to expose
```

## Step 4: Open in Browser

Open your browser and go to:
- **Frontend**: http://localhost:8080
- **Backend Health Check**: http://localhost:3001/api/health

## Step 5: Test the Application

### Option A: Use the Web Interface
1. Click "Upload Memory Footage" or "Search Your Memories"
2. Go to Dashboard
3. Upload a test video file
4. Try searching: "Where did I leave my water bottle?"

### Option B: Test API Directly (Terminal)

**Test Backend Health:**
```bash
curl http://localhost:3001/api/health
```

**Test Video Upload (replace with actual video file):**
```bash
curl -X POST http://localhost:3001/api/upload \
  -F "video=@/path/to/your/video.mp4" \
  -F "userId=test-user"
```

**Test Object Query:**
```bash
curl -X POST http://localhost:3001/api/query \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","query":"Where did I leave my water bottle?"}'
```

## 🛑 To Stop the Servers

Press `Ctrl + C` in each terminal window to stop the servers.

## 🐛 Troubleshooting

**Backend won't start?**
- Make sure `.env` file exists in `server/` directory
- Check if port 3001 is already in use: `lsof -i :3001`

**Frontend won't start?**
- Make sure you're in the project root (not server directory)
- Check if port 8080 is already in use: `lsof -i :8080`

**Connection errors?**
- Verify all API keys in `server/.env` are correct
- Check backend is running before testing frontend

