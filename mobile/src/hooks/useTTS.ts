import { useState, useCallback } from 'react';
import { Audio } from 'expo-av';
import { apiClient } from '../config/api';

export function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const playAudio = useCallback(async (base64Audio: string) => {
    try {
      // Stop any currently playing audio
      if (sound) {
        await sound.unloadAsync();
      }

      // Convert base64 to URI
      const audioUri = `data:audio/mpeg;base64,${base64Audio}`;
      
      // Create and play sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );

      setSound(newSound);
      setIsPlaying(true);

      // Clean up when finished
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  }, [sound]);

  const stopAudio = useCallback(async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
      setIsPlaying(false);
    }
  }, [sound]);

  return {
    isPlaying,
    playAudio,
    stopAudio,
  };
}

