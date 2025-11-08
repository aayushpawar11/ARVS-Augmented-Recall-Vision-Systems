import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { apiClient } from '../src/config/api';
import { getUserId } from '../src/utils/userId';

export default function UploadScreen() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [userId, setUserId] = useState<string>('');

  React.useEffect(() => {
    getUserId().then(setUserId);
  }, []);

  const pickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      await uploadVideo(file.uri);
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  const uploadVideo = async (uri: string) => {
    if (!userId) return;
    
    setUploading(true);
    setProgress(0);

    try {
      // Read file
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('File not found');
      }

      const response = await fetch(uri);
      const blob = await response.blob();

      // Create File object for upload
      const file = new File([blob], 'video.mp4', { type: 'video/mp4' });

      await apiClient.uploadVideo(file, userId, (prog) => {
        setProgress(prog);
      });

      Alert.alert('Success', 'Video uploaded successfully!');
      setProgress(0);
    } catch (error) {
      console.error('Error uploading:', error);
      Alert.alert('Error', 'Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Upload Video</Text>
        <Text style={styles.subtitle}>
          Upload a video to analyze and add to your memory
        </Text>

        {uploading && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.progressText}>
              Uploading... {progress}%
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, uploading && styles.buttonDisabled]}
          onPress={pickVideo}
          disabled={uploading}
        >
          <Text style={styles.buttonText}>
            {uploading ? 'Uploading...' : 'Select Video'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  progressText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
});

