import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { LiveOverlayHUD } from '../src/components/LiveOverlayHUD';
import { MicButton } from '../src/components/MicButton';
import { useLiveStream } from '../src/hooks/useLiveStream';
import { useTTS } from '../src/hooks/useTTS';
import { apiClient } from '../src/config/api';
import { getUserId } from '../src/utils/userId';
import * as FileSystem from 'expo-file-system';

export default function LiveScreen() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraType, setCameraType] = useState<CameraType>(CameraType.back);
  const [answer, setAnswer] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const { cameraRef, startStream, stopStream, isStreaming, userId } = useLiveStream();
  const { playAudio } = useTTS();
  const questionRef = useRef<string>('');

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    // Start stream when component mounts
    startStream().catch((error) => {
      Alert.alert('Error', 'Failed to start live stream');
      console.error(error);
    });

    // Cleanup on unmount
    return () => {
      stopStream();
    };
  }, []);

  const captureAndQuery = async (question: string) => {
    if (!cameraRef.current || !userId) return;

    setIsProcessing(true);
    setAnswer('');

    try {
      // Capture photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
      });

      if (!photo.uri) {
        throw new Error('Failed to capture photo');
      }

      // Read file as blob
      const fileInfo = await FileSystem.getInfoAsync(photo.uri);
      if (!fileInfo.exists) {
        throw new Error('Photo file not found');
      }

      const response = await fetch(photo.uri);
      const blob = await response.blob();

      // Send to API
      const result = await apiClient.liveAnswer(
        userId,
        question,
        blob,
        Date.now()
      );

      setAnswer(result.answer);

      // Play audio if available
      if (result.voiceAudio) {
        const base64Audio = result.voiceAudio.replace('data:audio/mpeg;base64,', '');
        await playAudio(base64Audio);
      }
    } catch (error) {
      console.error('Error querying:', error);
      Alert.alert('Error', 'Failed to get answer. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMicPress = () => {
    if (isRecording) {
      setIsRecording(false);
      // In a real implementation, you'd stop recording and get the transcript
      // For now, we'll use a placeholder question
      const question = questionRef.current || 'What do you see?';
      captureAndQuery(question);
    } else {
      setIsRecording(true);
      // Start recording (placeholder - would need speech recognition)
      questionRef.current = '';
    }
  };

  if (hasPermission === null) {
    return <View style={styles.container} />;
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Camera permission is required</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={cameraType}
        ratio="16:9"
      >
        <LiveOverlayHUD answer={answer} isProcessing={isProcessing} />
        
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.bottomControls}>
            <MicButton
              onPress={handleMicPress}
              isRecording={isRecording}
            />
          </View>
        </View>
      </Camera>
    </View>
  );
}

// Add missing imports
import { Text, TouchableOpacity } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  backButton: {
    marginTop: 50,
    marginLeft: 20,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomControls: {
    alignItems: 'center',
    marginBottom: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
  },
});

