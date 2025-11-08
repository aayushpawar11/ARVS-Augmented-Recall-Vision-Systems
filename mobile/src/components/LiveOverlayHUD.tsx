import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface LiveOverlayHUDProps {
  answer?: string;
  isProcessing?: boolean;
}

export function LiveOverlayHUD({ answer, isProcessing }: LiveOverlayHUDProps) {
  if (!answer && !isProcessing) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
      style={styles.container}
    >
      <BlurView intensity={80} style={styles.blur}>
        <View style={styles.content}>
          {isProcessing && (
            <Text style={styles.processingText}>Processing...</Text>
          )}
          {answer && (
            <Text style={styles.answerText}>{answer}</Text>
          )}
        </View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  blur: {
    borderRadius: 12,
    overflow: 'hidden',
    padding: 16,
  },
  content: {
    minHeight: 50,
  },
  processingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  answerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
});

