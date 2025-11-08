// Mobile-specific user ID management using AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_ID_KEY = '@arvs_user_id';

export async function getUserId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(USER_ID_KEY);
    if (stored) return stored;
    
    const newId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await AsyncStorage.setItem(USER_ID_KEY, newId);
    return newId;
  } catch (error) {
    // Fallback if AsyncStorage fails
    return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

