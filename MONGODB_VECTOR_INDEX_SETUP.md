# MongoDB Vector Search Index - Complete Step-by-Step Guide

This guide walks you through every single click and option to create the vector search index.

---

## Step 1: Log In to MongoDB Atlas

1. Open your web browser
2. Go to: **https://cloud.mongodb.com**
3. Enter your email and password
4. Click **"Sign In"** button

---

## Step 2: Navigate to Your Cluster

1. After logging in, you'll see the **"Projects"** page or **"Deployments"** page
2. Look for your cluster name (e.g., "Cluster0" or your custom name)
3. **Click on your cluster name** (it's usually a card/tile on the page)
   - OR if you see a list, click the cluster name in the list

---

## Step 3: Open the Search Section

1. On the left sidebar, you'll see several options:
   - Overview
   - Collections
   - **Search** ← Click this one
   - Performance Advisor
   - etc.

2. **Click "Search"** in the left sidebar
   - This opens the Atlas Search page

---

## Step 4: Create a New Search Index

1. On the Search page, you'll see:
   - A list of existing search indexes (may be empty if this is your first)
   - A button that says **"Create Search Index"** (usually at the top right)

2. **Click the "Create Search Index" button**
   - This opens a modal/dialog window

---

## Step 5: Choose Index Creation Method

You'll see two options:

1. **"Visual Editor"** (default, with a visual interface)
2. **"JSON Editor"** (text-based JSON editor)

**IMPORTANT: Click "JSON Editor"**
- This is the option you need
- It allows you to paste the exact JSON configuration

---

## Step 6: Select Database and Collection

After choosing JSON Editor, you'll see a form with:

1. **"Link Data Source"** section:
   - **"Atlas Cluster"** - Should already be selected (leave as is)
   - **"Database"** dropdown - Click it and select: **`memoryglass`**
     - If you don't see it, type `memoryglass` in the search box
   - **"Collection"** dropdown - Click it and select: **`video_embeddings`**
     - If the collection doesn't exist yet, that's OK - type `video_embeddings` anyway
     - The collection will be created automatically when you upload a video

2. **"Index Name"** field:
   - Type exactly: **`vector_index`**
   - This must match exactly (case-sensitive)
   - No spaces, no extra characters

---

## Step 7: Paste the JSON Configuration

1. You'll see a large text editor/textarea box
2. **Delete any existing text** in the box (if there is any)
3. **Paste this exact JSON:**

**Option 1 - If using JSON Editor (most common):**
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

**Option 2 - If the above doesn't work, try this full format:**
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

**Note:** MongoDB Atlas sometimes expects just the `fields` array directly. Try Option 1 first - it's the simpler format that usually works.

4. **Double-check:**
   - No extra commas
   - All quotes are straight quotes (not curly quotes)
   - All brackets match
   - `numDimensions` is exactly `512` (not 512.0 or "512")

---

## Step 8: Review Configuration

1. After pasting the JSON, you should see:
   - A preview or validation message
   - If there's a syntax error, it will be highlighted in red

2. **Check for errors:**
   - If you see red error messages, check your JSON syntax
   - Common issues:
     - Missing comma
     - Extra comma at the end
     - Wrong quote type (use straight quotes, not curly quotes)

3. If no errors, proceed to next step

---

## Step 9: Create the Index

1. At the bottom of the dialog, you'll see buttons:
   - **"Cancel"** (left side)
   - **"Next"** or **"Create Search Index"** (right side)

2. **Click "Next"** (if it says Next)
   - This takes you to a review page

3. On the review page:
   - You'll see a summary of your configuration
   - **Click "Create Search Index"** button (usually at bottom right)

---

## Step 10: Wait for Index to Build

1. After clicking "Create Search Index":
   - You'll be taken back to the Search indexes list
   - You'll see your new index: `vector_index`
   - Status will show: **"Building"** (with a yellow/orange indicator)

2. **Wait 2-5 minutes:**
   - The index needs to build before it can be used
   - Status will change from "Building" to **"Active"**
   - You'll see a green checkmark when it's active

3. **Refresh the page** if needed:
   - Click the refresh button (circular arrow icon)
   - Or press F5 to refresh

---

## Step 11: Verify Index is Active

1. On the Search indexes list, find `vector_index`
2. Check the **Status** column:
   - ✅ **"Active"** (green) = Ready to use!
   - ⏳ **"Building"** (yellow) = Still processing, wait a bit longer
   - ❌ **"Failed"** (red) = There's an error, check the error message

3. **If Active:**
   - You're done! The index is ready
   - You can now use vector search

4. **If Building:**
   - Wait a few more minutes
   - Refresh the page
   - Check again

5. **If Failed:**
   - Click on the index name to see error details
   - Common issues:
     - Wrong collection name
     - JSON syntax error
     - Database doesn't exist
   - Fix the issue and try again

---

## Visual Guide (What You'll See)

### Step 3 - Search Page:
```
┌─────────────────────────────────────┐
│  Atlas Search                       │
├─────────────────────────────────────┤
│                                     │
│  [Create Search Index]  ← Click    │
│                                     │
│  (List of indexes - may be empty)  │
└─────────────────────────────────────┘
```

### Step 5 - Creation Method:
```
┌─────────────────────────────────────┐
│  Create Search Index                │
├─────────────────────────────────────┤
│  Choose a method:                   │
│                                     │
│  ○ Visual Editor                    │
│  ● JSON Editor          ← Select    │
│                                     │
│  [Cancel]  [Next]                   │
└─────────────────────────────────────┘
```

### Step 6 - Database/Collection Selection:
```
┌─────────────────────────────────────┐
│  Configure Search Index            │
├─────────────────────────────────────┤
│  Link Data Source:                  │
│  Atlas Cluster: [Your Cluster]      │
│                                     │
│  Database: [memoryglass ▼]  ← Click│
│  Collection: [video_embeddings ▼]  │
│                                     │
│  Index Name:                        │
│  [vector_index]  ← Type exactly    │
│                                     │
│  JSON Configuration:                │
│  ┌─────────────────────────────┐   │
│  │ {                          │   │
│  │   "name": "vector_index",  │   │
│  │   ...                      │   │
│  │ }                          │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Cancel]  [Next]                   │
└─────────────────────────────────────┘
```

### Step 10 - Index Status:
```
┌─────────────────────────────────────┐
│  Search Indexes                     │
├─────────────────────────────────────┤
│  Name          Status               │
│  ────────────────────────────────  │
│  vector_index  ⏳ Building          │
│                (wait 2-5 min)      │
│                                     │
│  After building:                    │
│  vector_index  ✅ Active  ← Ready! │
└─────────────────────────────────────┘
```

---

## Troubleshooting

### "Collection doesn't exist" Error

**Solution:** This is OK! The collection will be created automatically when you upload your first video. Just proceed with creating the index.

### "Invalid JSON" Error

**Common causes:**
- Extra comma at the end of arrays/objects
- Missing comma between properties
- Wrong quote type (use `"` not `"` or `"`)
- Missing closing bracket

**Fix:** Copy the JSON exactly as shown above, character by character.

### "Index name already exists" Error

**Solution:** 
- Either delete the existing index first
- Or use a different name (but then update the code to match)

### Index Stuck on "Building"

**Solutions:**
- Wait 10-15 minutes (large collections take longer)
- Check if your cluster is running (not paused)
- Try refreshing the page
- If still stuck after 15 minutes, delete and recreate the index

### Can't Find "Search" in Sidebar

**Possible reasons:**
- You're on the wrong page (make sure you clicked on your cluster)
- Your Atlas tier doesn't support Search (free tier supports it)
- Try refreshing the page

**Solution:** Make sure you're viewing your cluster, not the projects page.

---

## Verification Checklist

After completing all steps, verify:

- [ ] Index name is exactly `vector_index`
- [ ] Status shows "Active" (green checkmark)
- [ ] Database is `memoryglass`
- [ ] Collection is `video_embeddings`
- [ ] JSON configuration matches exactly (512 dimensions, cosine similarity)

---

## What Happens Next

Once the index is "Active":

1. **Upload a video** - It will be vectorized automatically
2. **Make a query** - Vector search will work instantly
3. **Check MongoDB** - You'll see embeddings in `video_embeddings` collection

The system is ready to use!

---

## Need Help?

If you get stuck:
1. Check the error message in MongoDB Atlas
2. Verify your JSON syntax matches exactly
3. Make sure your cluster is running (not paused)
4. Try deleting and recreating the index

The index is the only thing that must be done manually - everything else is automated!

