import { ObjectId } from 'mongodb';

/**
 * Store video embeddings in MongoDB
 * @param {Object} db - MongoDB database instance
 * @param {string} videoId - Video document ID
 * @param {string} userId - User ID
 * @param {Array} embeddings - Array of embedding objects with frame and embedding
 * @param {Array} captions - Optional array of captions (same length as embeddings)
 */
export async function storeVideoEmbeddings(db, videoId, userId, embeddings, captions = []) {
  try {
    const collection = db.collection('video_embeddings');
    
    const documents = embeddings.map((emb, index) => ({
      userId,
      videoId: new ObjectId(videoId),
      timestamp: emb.frame.timestamp,
      frameNumber: emb.frame.frameNumber,
      caption: captions[index] || '',
      objects: [], // Can be populated from Gemini analysis later
      embedding: emb.embedding, // Array of numbers
      metadata: {
        scene: '',
        activity: '',
        location: ''
      }
    }));
    
    // Batch insert for efficiency
    if (documents.length > 0) {
      await collection.insertMany(documents);
      console.log(`✅ Stored ${documents.length} embeddings for video ${videoId}`);
    }
    
    return documents.length;
  } catch (error) {
    console.error('Error storing embeddings:', error);
    throw error;
  }
}

/**
 * Search for similar embeddings using vector search
 * @param {Object} db - MongoDB database instance
 * @param {string} userId - User ID
 * @param {Array} queryEmbedding - Query embedding vector
 * @param {number} limit - Number of results to return
 * @returns {Promise<Array>} Array of matching frames with metadata
 */
export async function searchVectors(db, userId, queryEmbedding, limit = 10) {
  try {
    const collection = db.collection('video_embeddings');
    
    const results = await collection.aggregate([
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: Math.max(limit * 10, 100), // Consider more candidates for better results
          limit: limit
        }
      },
      {
        $match: {
          userId: userId // Filter by user
        }
      },
      {
        $lookup: {
          from: 'videos',
          localField: 'videoId',
          foreignField: '_id',
          as: 'video'
        }
      },
      {
        $unwind: {
          path: '$video',
          preserveNullAndEmptyArrays: true // Keep results even if video not found
        }
      },
      {
        $project: {
          _id: 1,
          videoId: 1,
          timestamp: 1,
          frameNumber: 1,
          caption: 1,
          objects: 1,
          metadata: 1,
          filename: { 
            $ifNull: [
              '$video.filename', 
              { 
                $cond: {
                  if: { $eq: [{ $type: '$videoId' }, 'string'] },
                  then: { $concat: ['Live Session - ', { $toString: '$timestamp' }, 's'] },
                  else: 'unknown'
                }
              }
            ] 
          },
          uploadedAt: { 
            $ifNull: [
              '$video.uploadedAt', 
              { 
                $cond: {
                  if: { $ne: ['$metadata.sessionStartedAt', null] },
                  then: { $toDate: '$metadata.sessionStartedAt' },
                  else: new Date()
                }
              }
            ] 
          },
          isLiveSession: { $ifNull: ['$metadata.isLiveSession', false] },
          score: { $meta: 'vectorSearchScore' } // Similarity score (0-1)
        }
      },
      {
        $sort: { score: -1 } // Sort by similarity (highest first)
      }
    ]).toArray();
    
    return results;
  } catch (error) {
    console.error('Error in vector search:', error);
    
    // If vector search index doesn't exist, provide helpful error
    if (error.message?.includes('vector') || error.message?.includes('index')) {
      throw new Error('Vector search index not found. Please create a vector search index named "vector_index" on the video_embeddings collection in MongoDB Atlas.');
    }
    
    throw error;
  }
}

/**
 * Create vector search index (helper function - usually done via MongoDB Atlas UI)
 * This is a reference for the index definition
 */
export function getVectorIndexDefinition() {
  return {
    name: 'vector_index',
    type: 'vectorSearch',
    definition: {
      fields: [
        {
          type: 'vector',
          path: 'embedding',
          numDimensions: 512, // CLIP vit-base-patch32 dimensions
          similarity: 'cosine'
        }
      ]
    }
  };
}

/**
 * Format timestamp from seconds to HH:MM:SS
 */
export function formatTimestamp(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Extract object name from query (simple heuristic)
 */
export function extractObjectName(query) {
  const lowerQuery = query.toLowerCase();
  
  // Common patterns
  const patterns = [
    /(?:where did i (?:leave|put|place)) (.+?)(?:\?|$)/i,
    /(?:where is (?:my|the)) (.+?)(?:\?|$)/i,
    /(?:find|locate|search for) (.+?)(?:\?|$)/i
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // Fallback: return query without question words
  return query.replace(/\b(where|did|i|leave|put|place|my|the|is|find|locate|search|for)\b/gi, '').trim();
}

