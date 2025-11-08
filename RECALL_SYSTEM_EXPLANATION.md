# Current Recall System Implementation

## Overview

I've built a recall system that allows users to search through their video memories using natural language queries. The system can handle two main types of queries: location-based searches where users ask "where did I leave X?" and general questions about video content like "what was I doing?" The entire system is powered by Google Gemini AI for natural language understanding, and it searches through video metadata stored in MongoDB rather than analyzing video files directly for most queries.

## How It Works

When a user submits a query through the frontend interface, the system first classifies the query type using a simple keyword-based detection function. If the query contains words like "where", "left", or "placed" combined with action words like "leave" or "did", it's classified as a location query. Otherwise, it's treated as a general question. This classification determines which search function gets called and how the results are processed.

For location queries, the system fetches the user's last 50 videos from MongoDB, but only pulls specific fields like filename, upload date, and the arrays of detected objects, activities, people, and scenes. I limit it to 50 videos to keep the payload size manageable since we're sending all this data to Gemini AI. Within each video, I also limit the arrays - only the top 20 objects (sorted by confidence), top 10 activities, top 5 people, and top 5 scenes. The summary is truncated to 500 characters. This optimization is crucial because Gemini has token limits, and sending too much data would either fail or be very expensive.

The system then builds a comprehensive prompt that includes the user's query and all this video metadata formatted as JSON. I instruct Gemini to analyze the query, search through the video data, and return a structured JSON response with matches, a best match, the extracted object name, and confidence scores. Gemini is pretty good at understanding natural language, so it can match "water bottle" even if the user asks "where's my bottle" or uses slightly different wording. The response includes all relevant matches across videos, with the most recent or most relevant one marked as the best match.

For general questions, the process is similar but slightly different. If a specific video ID is provided, the system can actually read the video file, convert it to base64, and send it directly to Gemini for frame-by-frame analysis. This is more accurate but slower and more expensive. More commonly, it works like location queries - fetching the last 10 videos and using their metadata to answer questions. The metadata includes summaries, detected objects, activities, people, and scenes, which gives Gemini enough context to provide comprehensive answers about what happened in the videos.

After Gemini returns the results, the system generates a human-readable response text. For location queries, it creates something like "I found your water bottle. It was last seen on desk, center-right at 10:30 AM." For general questions, it uses the answer Gemini provided. This text is then sent to ElevenLabs API to generate a natural-sounding voice response, which gets returned as base64-encoded MP3 audio. The frontend automatically plays this audio when results are received.

## Current Implementation Details

The query classification is pretty basic - it just looks for specific keywords. I know this could be improved with better NLP, but it works for most common queries. The location detection looks for words like "where", "left", "placed", "put", "location", or "position" combined with action words, which catches most location-based questions. Everything else falls into the general category.

I'm using Gemini 2.0 Flash Experimental model because it's fast and good at understanding natural language while also being able to parse and generate structured JSON. The system has rate limiting built in - there's a minimum 1 second delay between requests, and if we hit a rate limit error (429), it automatically retries with exponential backoff (2 seconds, then 4, then 8). It will retry up to 3 times before giving up. This prevents API spam and handles temporary rate limits gracefully.

The database queries are optimized with field projection - I only fetch the fields I need rather than entire documents. I also have indexes on userId and uploadedAt for fast queries. The results are sorted by upload date descending, so the most recent videos come first, which makes sense for recall queries where users are usually looking for recent memories.

When parsing Gemini's response, I use a regex to extract the JSON because Gemini sometimes adds explanatory text before or after the JSON. The regex finds the first complete JSON object in the response and parses that. If parsing fails, there's a fallback that just returns the raw text as the answer, which isn't ideal but prevents the system from crashing.

For voice responses, I'm using ElevenLabs with their multilingual model. The voice settings are set to moderate stability (0.5) and high similarity boost (0.75) to get natural-sounding speech. If the API key isn't configured or there's an error, it gracefully degrades by returning null, and the frontend can fall back to browser text-to-speech if needed.

## Frontend Experience

On the frontend, users see a simple search interface with a text input, a microphone button (currently simulated - not fully implemented with Web Speech API), and a search button. When they submit a query, it shows a loading state, then displays the results. For location queries, it shows the found object name, the best match with location and timestamp, and lists all matches in a card layout. For general questions, it displays the answer text prominently. The voice audio plays automatically when available, and there's a button to replay it if needed.

The results display shows confidence scores as percentages with visual progress bars, which helps users understand how certain the system is about each match. Each match card shows the video filename, location description, timestamps, and confidence. The UI is clean and focused on presenting the information clearly.

## Current Limitations and Concerns

One major limitation is that the recall accuracy is entirely dependent on how well the videos were processed initially. If an object wasn't detected during video processing, it simply won't be found during recall. The system only stores the top 50 objects per video (sorted by confidence), so less prominent objects might not be searchable even if they were visible in the video.

The query classification is quite basic and might misclassify some edge cases. For example, "where did I see that person?" might be classified as location when it's really more of a general question. The natural language understanding relies entirely on Gemini, which is generally good but can sometimes misinterpret ambiguous queries. There's no query refinement or clarification - if Gemini misunderstands, the user just gets a wrong answer.

I'm not using any semantic search or vector embeddings. The system relies on Gemini's ability to understand natural language and match against the stored metadata. This means it might miss synonyms or related terms. For example, if someone searches for "beverage container" but the system only has "water bottle" stored, it might not make the connection unless Gemini is smart enough to infer it.

The search is limited to recent videos - only the last 50 for location queries and last 10 for general questions. Older videos won't be included in search results, which could be a problem for users with large video libraries. There's also no way to filter by date range, location, or other criteria.

Another issue is that if a video is still being processed, it won't be searchable. There's no real-time update mechanism - no WebSockets or polling to notify users when processing completes. Users would need to manually refresh or wait and try again.

The system doesn't have any caching layer. Every query goes through the full process of fetching data, building prompts, calling Gemini, and generating voice responses. This means identical queries are processed from scratch each time, which is inefficient and expensive. I could cache frequent queries or Gemini responses to improve performance and reduce costs.

## Performance Considerations

I've tried to optimize performance by limiting the amount of data fetched and sent to Gemini. The 50-video limit for location queries and 10-video limit for general queries keeps the prompts manageable. The array limits within each video (top 20 objects, top 10 activities, etc.) prevent the prompts from becoming too large. The summary truncation to 500 characters also helps.

The database queries use field projection to only fetch needed fields, and the indexes on userId and uploadedAt make queries fast. The rate limiting prevents API spam and handles temporary issues gracefully. However, I'm aware that the system could be faster with caching, and the current approach of sending all video metadata to Gemini for every query isn't the most efficient.

## What I'd Like Feedback On

I'm particularly interested in feedback on a few areas. First, the query classification - is the keyword-based approach sufficient, or should I use a more sophisticated NLP model? Second, the data limits - are 50 videos for location queries and 10 for general queries reasonable, or should these be configurable? Third, the lack of semantic search - should I implement vector embeddings for better matching, or is Gemini's natural language understanding enough?

I'm also curious about the trade-offs between using video metadata versus analyzing actual video files. The metadata approach is faster and cheaper, but might miss details. The direct video analysis is more accurate but slower and more expensive. Should I have a hybrid approach where I use metadata first and only analyze video files for specific high-confidence queries?

The caching question is important too - should I implement a caching layer, and if so, what should be cached? Query results? Gemini responses? Video metadata? And how should cache invalidation work when new videos are processed?

Finally, I'm wondering about the user experience. Is the automatic voice playback good, or should it be opt-in? Should there be query history or suggestions? Should users be able to refine or clarify queries? The current system is pretty straightforward but might benefit from more interactive features.

Overall, the system works for basic use cases, but I know there's room for improvement in accuracy, performance, and user experience. I'd appreciate any suggestions on how to make it better.
