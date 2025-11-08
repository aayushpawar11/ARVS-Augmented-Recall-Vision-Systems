// Mobile API configuration
import { createApiClient } from '@arvs/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL_KEY = '@arvs_api_url';
const DEFAULT_API_URL = 'http://localhost:3001';

// Get API base URL from AsyncStorage or environment or default
async function getApiBaseUrl(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(API_URL_KEY);
    if (saved) return saved;
  } catch (error) {
    console.error('Error loading API URL from storage:', error);
  }
  
  // Fallback to environment variable or default
  return process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;
}

// Initialize with default, will be updated when storage loads
export const apiClient = createApiClient(DEFAULT_API_URL);

// Load saved API URL on startup
getApiBaseUrl().then((url) => {
  apiClient.setBaseURL(url);
});

// Export function to update API URL
export async function updateApiUrl(url: string) {
  try {
    await AsyncStorage.setItem(API_URL_KEY, url);
    apiClient.setBaseURL(url);
  } catch (error) {
    console.error('Error saving API URL:', error);
  }
}

