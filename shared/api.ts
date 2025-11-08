import axios, { AxiosInstance } from 'axios';
import type {
  QueryResponse,
  LiveAnswerResponse,
  VideoUploadResponse,
  VideoMetadata,
  HealthCheckResponse,
  LiveStreamSession,
} from './types';

export class ARVSApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string = 'http://localhost:3001') {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  setBaseURL(baseURL: string) {
    this.client.defaults.baseURL = baseURL;
  }

  // Health check
  async healthCheck(): Promise<HealthCheckResponse> {
    const response = await this.client.get('/api/health');
    return response.data;
  }

  // Upload video
  async uploadVideo(
    file: File | Blob,
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<VideoUploadResponse> {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('userId', userId);

    const response = await this.client.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });

    return response.data;
  }

  // Query for objects or answer questions
  async query(
    userId: string,
    query: string,
    videoId?: string
  ): Promise<QueryResponse> {
    const response = await this.client.post('/api/query', {
      userId,
      query,
      videoId,
    });
    return response.data;
  }

  // Get user's videos
  async getVideos(userId: string): Promise<{ videos: VideoMetadata[] }> {
    const response = await this.client.get(`/api/videos/${userId}`);
    return response.data;
  }

  // Get video questions
  async getVideoQuestions(videoId: string): Promise<{
    questions: any[];
    transcript: string;
    filename: string;
  }> {
    const response = await this.client.get(`/api/video/${videoId}/questions`);
    return response.data;
  }

  // Live stream - start session
  async startLiveStream(userId: string): Promise<LiveStreamSession> {
    const response = await this.client.post('/api/live-stream/start', {
      userId,
    });
    return response.data;
  }

  // Live stream - send chunk
  async sendLiveChunk(
    userId: string,
    videoChunk: File | Blob
  ): Promise<{
    success: boolean;
    chunkIndex: number;
    memorySize: { objects: number; activities: number };
  }> {
    const formData = new FormData();
    formData.append('video', videoChunk);
    formData.append('userId', userId);

    const response = await this.client.post('/api/live-stream/chunk', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  // Live stream - end session
  async endLiveStream(userId: string): Promise<{
    success: boolean;
    duration?: number;
    objectsDetected?: number;
    activitiesDetected?: number;
  }> {
    const response = await this.client.post('/api/live-stream/end', {
      userId,
    });
    return response.data;
  }

  // Live answer (with video chunk + question)
  async liveAnswer(
    userId: string,
    question: string,
    videoChunk: File | Blob,
    timestamp?: number
  ): Promise<LiveAnswerResponse> {
    const formData = new FormData();
    formData.append('video', videoChunk);
    formData.append('userId', userId);
    formData.append('question', question);
    if (timestamp) {
      formData.append('timestamp', timestamp.toString());
    }

    const response = await this.client.post('/api/live-answer', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  // Mint NFT
  async mintNFT(userId: string, memoryData: any): Promise<{
    success: boolean;
    address?: string;
  }> {
    const response = await this.client.post('/api/mint-nft', {
      userId,
      memoryData,
    });
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new ARVSApiClient();

// Export factory function for custom base URL
export function createApiClient(baseURL: string): ARVSApiClient {
  return new ARVSApiClient(baseURL);
}

