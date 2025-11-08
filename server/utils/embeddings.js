import { pipeline } from '@xenova/transformers';
import { readFile } from 'fs/promises';

let clipModel = null;

/**
 * Initialize CLIP model (lazy loading)
 */
async function getClipModel() {
  if (!clipModel) {
    console.log('🔄 Loading CLIP model (first time may download ~500MB)...');
    clipModel = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32');
    console.log('✅ CLIP model loaded');
  }
  return clipModel;
}

/**
 * Generate embeddings for image frames
 * @param {Array} frames - Array of frame objects with path property
 * @returns {Promise<Array>} Array of embeddings with frame info
 */
export async function generateFrameEmbeddings(frames) {
  try {
    const model = await getClipModel();
    const embeddings = [];
    
    console.log(`🔢 Generating embeddings for ${frames.length} frames...`);
    
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      
      try {
        // Read image file
        const imageBuffer = await readFile(frame.path);
        
        // Generate embedding
        const embedding = await model(imageBuffer, { task: 'image' });
        
        embeddings.push({
          frame: frame,
          embedding: Array.from(embedding.data), // Convert to regular array
          dimensions: embedding.data.length
        });
        
        if ((i + 1) % 10 === 0) {
          console.log(`  Processed ${i + 1}/${frames.length} frames...`);
        }
      } catch (error) {
        console.error(`Error processing frame ${frame.path}:`, error);
        // Continue with other frames
      }
    }
    
    console.log(`✅ Generated ${embeddings.length} embeddings`);
    return embeddings;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw error;
  }
}

/**
 * Generate embedding for text query
 * @param {string} queryText - User's query text
 * @returns {Promise<Array>} Text embedding vector
 */
export async function generateQueryEmbedding(queryText) {
  try {
    const model = await getClipModel();
    
    // CLIP can embed text directly
    const embedding = await model(queryText, { task: 'text' });
    
    return Array.from(embedding.data); // Convert to regular array
  } catch (error) {
    console.error('Error generating query embedding:', error);
    throw error;
  }
}

/**
 * Get embedding dimensions (for MongoDB index setup)
 */
export function getEmbeddingDimensions() {
  // CLIP vit-base-patch32 produces 512-dimensional embeddings
  return 512;
}

