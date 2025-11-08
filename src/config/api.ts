// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const API_ENDPOINTS = {
  UPLOAD: `${API_BASE_URL}/api/upload`,
  QUERY: `${API_BASE_URL}/api/query`,
  VIDEOS: (userId: string) => `${API_BASE_URL}/api/videos/${userId}`,
  VIDEO_QUESTIONS: (videoId: string) => `${API_BASE_URL}/api/video/${videoId}/questions`,
  LIVE_ANSWER: `${API_BASE_URL}/api/live-answer`,
  LIVE_STREAM_START: `${API_BASE_URL}/api/live-stream/start`,
  LIVE_STREAM_CHUNK: `${API_BASE_URL}/api/live-stream/chunk`,
  LIVE_STREAM_END: `${API_BASE_URL}/api/live-stream/end`,
  MINT_NFT: `${API_BASE_URL}/api/mint-nft`,
  HEALTH: `${API_BASE_URL}/api/health`,
};

