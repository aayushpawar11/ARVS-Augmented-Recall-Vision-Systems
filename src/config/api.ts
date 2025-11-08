// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const API_ENDPOINTS = {
  UPLOAD: `${API_BASE_URL}/api/upload`,
  QUERY: `${API_BASE_URL}/api/query`,
  VIDEOS: (userId: string) => `${API_BASE_URL}/api/videos/${userId}`,
  MINT_NFT: `${API_BASE_URL}/api/mint-nft`,
  HEALTH: `${API_BASE_URL}/api/health`,
};

