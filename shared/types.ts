// Shared TypeScript interfaces for ARVS/MemoryGlass

export interface VideoMetadata {
  _id: string;
  userId: string;
  filename: string;
  uploadedAt: string;
  processed: boolean;
  summary?: string;
  objects?: DetectedObject[];
  activities?: Activity[];
  people?: Person[];
  scenes?: Scene[];
  questions?: QuestionAnswer[];
  transcript?: string;
}

export interface DetectedObject {
  object: string;
  timestamp: string;
  location?: string;
  confidence?: number;
}

export interface Activity {
  activity: string;
  timestamp: string;
  description?: string;
}

export interface Person {
  description: string;
  actions?: string[];
  timestamp: string;
}

export interface Scene {
  scene: string;
  timestamp: string;
  description?: string;
}

export interface QuestionAnswer {
  question: string;
  answer: string;
  timestamp: string;
  confidence?: number;
  answeredAt?: string;
}

export interface QueryResponse {
  queryType: 'location' | 'general';
  object?: string;
  answer: string;
  matches?: QueryMatch[];
  bestMatch?: QueryMatch;
  responseText?: string;
  voiceAudio?: string;
}

export interface QueryMatch {
  videoId: string;
  filename: string;
  timestamp?: string;
  location?: string;
  confidence?: number;
  uploadedAt: string;
  relevantInfo?: string;
}

export interface LiveAnswerResponse {
  answer: string;
  question: string;
  timestamp: number;
  voiceAudio?: string;
  usedMemory?: boolean;
  memoryContext?: {
    objectsFound: number;
    activitiesFound: number;
  };
  fallback?: boolean;
}

export interface LiveStreamSession {
  sessionId: string;
  startedAt: number;
  message?: string;
}

export interface VideoUploadResponse {
  success: boolean;
  videoId: string;
  filename: string;
  message: string;
}

export interface HealthCheckResponse {
  status: string;
  services: {
    mongodb: boolean;
    gemini: boolean;
    solana: boolean;
  };
}

