import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';

interface MicButtonProps {
  onPress: () => void;
  isRecording: boolean;
}

export function MicButton({ onPress, isRecording }: MicButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.container}
      activeOpacity={0.8}
    >
      <BlurView intensity={20} style={styles.blur}>
        <View style={[styles.mic, isRecording && styles.micRecording]} />
      </BlurView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 70,
    height: 70,
    borderRadius: 35,
    overflow: 'hidden',
  },
  blur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  micRecording: {
    backgroundColor: '#ef4444',
  },
});

