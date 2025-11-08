# Quick Start - Get Running in 5 Minutes

## TL;DR - Just Do These 3 Things:

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Create MongoDB Vector Search Index
- Go to: https://cloud.mongodb.com
- Your cluster → **Search** → **Create Search Index**
- Choose **JSON Editor**
- Database: `memoryglass`, Collection: `video_embeddings`, Name: `vector_index`
- Paste this JSON (try the simple version first):
```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 512,
      "similarity": "cosine"
    }
  ]
}
```

If that doesn't work, try the full format:
```json
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
```
- Click **Create** and wait for status to be **"Active"** (2-5 minutes)

### 3. Start Server
```bash
cd server
npm run dev
```

**Done!** Upload a video and try a query.

---

## Detailed Instructions

See `COMPLETE_SETUP_CHECKLIST.md` for step-by-step guide with troubleshooting.
