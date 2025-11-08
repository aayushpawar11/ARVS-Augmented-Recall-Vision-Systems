import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#000',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'MemoryGlass' }} />
      <Stack.Screen name="live" options={{ title: 'Live AR', headerShown: false }} />
      <Stack.Screen name="upload" options={{ title: 'Upload Video' }} />
      <Stack.Screen name="search" options={{ title: 'Search Memories' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}

