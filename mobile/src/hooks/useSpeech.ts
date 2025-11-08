import { useState, useCallback } from 'react';
import * as Speech from 'expo-speech';

export function useSpeech() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const startListening = useCallback(() => {
    setIsListening(true);
    // Note: Expo Speech doesn't have speech recognition
    // You would need to use a third-party service or native module
    // For now, this is a placeholder
    console.log('Speech recognition not available in Expo Speech');
  }, []);

  const stopListening = useCallback(() => {
    setIsListening(false);
  }, []);

  const speak = useCallback((text: string) => {
    Speech.speak(text, {
      language: 'en-US',
      pitch: 1.0,
      rate: 1.0,
    });
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    speak,
  };
}

