import { useState, useCallback, useRef, useEffect } from 'react';
import { Camera } from 'expo-camera';
import { apiClient } from '../config/api';
import { getUserId } from '../utils/userId';

export function useLiveStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const cameraRef = useRef<Camera>(null);
  const chunkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    getUserId().then(setUserId);
  }, []);

  const startStream = useCallback(async () => {
    try {
      const response = await apiClient.startLiveStream(userId);
      setSessionId(response.sessionId);
      setIsStreaming(true);

      // Start capturing chunks every 3 seconds
      chunkIntervalRef.current = setInterval(async () => {
        if (cameraRef.current) {
          try {
            const photo = await cameraRef.current.takePictureAsync({
              quality: 0.5,
              base64: false,
            });

            if (photo.uri) {
              // Convert to blob for upload
              const response = await fetch(photo.uri);
              const blob = await response.blob();
              
              await apiClient.sendLiveChunk(userId, blob);
            }
          } catch (error) {
            console.error('Error sending chunk:', error);
          }
        }
      }, 3000);
    } catch (error) {
      console.error('Error starting stream:', error);
      throw error;
    }
  }, [userId]);

  const stopStream = useCallback(async () => {
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }

    try {
      await apiClient.endLiveStream(userId);
      setIsStreaming(false);
      setSessionId(null);
    } catch (error) {
      console.error('Error stopping stream:', error);
    }
  }, [userId]);

  return {
    isStreaming,
    sessionId,
    cameraRef,
    startStream,
    stopStream,
  };
}

