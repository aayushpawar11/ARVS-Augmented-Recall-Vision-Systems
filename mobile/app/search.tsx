import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { apiClient } from '../src/config/api';
import { getUserId } from '../src/utils/userId';
import type { VideoMetadata, QueryResponse } from '@arvs/shared';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QueryResponse | null>(null);
  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>('');

  React.useEffect(() => {
    getUserId().then(setUserId);
  }, []);

  const loadVideos = async () => {
    if (!userId) return;
    try {
      const response = await apiClient.getVideos(userId);
      setVideos(response.videos);
    } catch (error) {
      console.error('Error loading videos:', error);
    }
  };

  React.useEffect(() => {
    if (userId) {
      loadVideos();
    }
  }, [userId]);

  const handleSearch = async () => {
    if (!query.trim() || !userId) return;

    setLoading(true);
    try {
      const result = await apiClient.query(userId, query);
      setResults(result);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask a question..."
          placeholderTextColor="#666"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.searchButtonText}>Search</Text>
          )}
        </TouchableOpacity>
      </View>

      {results && (
        <View style={styles.resultsContainer}>
          <Text style={styles.answerTitle}>Answer:</Text>
          <Text style={styles.answer}>{results.answer}</Text>

          {results.matches && results.matches.length > 0 && (
            <View style={styles.matchesContainer}>
              <Text style={styles.matchesTitle}>Found in:</Text>
              {results.matches.map((match, index) => (
                <View key={index} style={styles.matchItem}>
                  <Text style={styles.matchFilename}>{match.filename}</Text>
                  {match.timestamp && (
                    <Text style={styles.matchTimestamp}>{match.timestamp}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <View style={styles.videosContainer}>
        <Text style={styles.videosTitle}>Your Videos ({videos.length})</Text>
        <FlatList
          data={videos}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.videoItem}>
              <Text style={styles.videoFilename}>{item.filename}</Text>
              <Text style={styles.videoDate}>
                {new Date(item.uploadedAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  searchContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  input: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  answerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  answer: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 24,
  },
  matchesContainer: {
    marginTop: 16,
  },
  matchesTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  matchItem: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  matchFilename: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  matchTimestamp: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  videosContainer: {
    flex: 1,
    padding: 20,
  },
  videosTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  videoItem: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  videoFilename: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  videoDate: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
});

