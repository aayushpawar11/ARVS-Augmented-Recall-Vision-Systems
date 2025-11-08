# Mobile App Setup Guide

This guide explains how to set up and run the MemoryGlass mobile app (iOS/Android) built with Expo + React Native.

## 📱 Project Structure

```
ARVS-Augmented-Recall-Vision-Systems/
├── mobile/              # Expo React Native app
│   ├── app/            # Expo Router screens
│   ├── src/
│   │   ├── components/ # React Native components
│   │   ├── hooks/      # Custom hooks
│   │   ├── config/     # API configuration
│   │   └── utils/      # Mobile utilities
│   └── package.json
├── shared/              # Shared TypeScript code
│   ├── api.ts          # API client
│   ├── types.ts        # TypeScript interfaces
│   └── utils.ts        # Shared utilities
└── server/             # Backend API
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac only) or Android Emulator
- Physical device with Expo Go app (optional)

### Installation

1. **Install dependencies** (from root):
   ```bash
   npm install
   ```

2. **Install mobile dependencies**:
   ```bash
   cd mobile
   npm install
   ```

### Running the Mobile App

1. **Start the backend server** (in one terminal):
   ```bash
   npm run dev:server
   ```

2. **Start the mobile app** (in another terminal):
   ```bash
   npm run dev:mobile
   # or
   cd mobile && npm start
   ```

3. **Run on device/simulator**:
   - **iOS**: Press `i` in the Expo terminal or run `npm run ios`
   - **Android**: Press `a` in the Expo terminal or run `npm run android`
   - **Physical device**: Scan QR code with Expo Go app

## 🔧 Configuration

### API Base URL

The mobile app needs to connect to your backend server. Configure it in the Settings screen:

1. Open the app
2. Go to Settings
3. Enter your server URL (e.g., `http://localhost:3001` or ngrok tunnel)
4. Save

**For development with physical device:**
- Use ngrok or similar tunnel: `ngrok http 3001`
- Enter the ngrok URL in Settings (e.g., `https://abc123.ngrok.io`)

### Environment Variables

Create `mobile/.env` (optional):
```
EXPO_PUBLIC_API_URL=https://your-server.com
```

## 📱 App Features

### Screens

1. **Dashboard** (`/`) - Main menu with navigation
2. **Live AR** (`/live`) - Live camera streaming with AI overlay
3. **Upload Video** (`/upload`) - Upload and analyze videos
4. **Search Memories** (`/search`) - Query past videos
5. **Settings** (`/settings`) - Configure API URL and preferences

### Live AR Mode

The Live AR screen (`/live`) provides:
- Real-time camera preview
- Voice query input (tap mic button)
- AI-generated overlay with answers
- Text-to-speech audio responses
- Automatic chunk capture every 3 seconds

### Components

- `LiveOverlayHUD` - Blurred overlay showing AI responses
- `MicButton` - Voice input button with recording state

### Hooks

- `useLiveStream` - Manages live streaming session
- `useTTS` - Text-to-speech audio playback
- `useSpeech` - Voice recognition (placeholder)

## 🏗️ Development

### Adding New Screens

1. Create file in `mobile/app/` (e.g., `new-screen.tsx`)
2. Add route in `mobile/app/_layout.tsx`
3. Navigate using `router.push('/new-screen')`

### Using Shared Code

Import from `@arvs/shared`:
```typescript
import { apiClient, VideoMetadata } from '@arvs/shared';
```

### API Client Usage

```typescript
import { apiClient } from '../src/config/api';

// Query
const result = await apiClient.query(userId, 'What did I see?');

// Upload video
await apiClient.uploadVideo(file, userId);

// Live answer
const answer = await apiClient.liveAnswer(userId, question, videoBlob);
```

## 🐛 Troubleshooting

### Camera Permission Denied
- iOS: Check Info.plist permissions in `app.json`
- Android: Check AndroidManifest.xml permissions

### API Connection Failed
- Ensure backend is running (`npm run dev:server`)
- Check API URL in Settings
- For physical device, use ngrok tunnel (localhost won't work)

### Build Errors
- Clear cache: `expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### Metro Bundler Issues
- Reset Metro: `expo start --clear`
- Check Node version: `node --version` (should be 18+)

## 📦 Building for Production

### iOS
```bash
cd mobile
eas build --platform ios
```

### Android
```bash
cd mobile
eas build --platform android
```

Requires Expo Application Services (EAS) account.

## 🔗 Backend Integration

The mobile app uses the same backend API as the web app:
- `/api/upload` - Video upload
- `/api/query` - Query videos
- `/api/live-answer` - Live Q&A
- `/api/live-stream/*` - Live streaming endpoints

Ensure CORS is enabled in backend for mobile access.

## 📝 Notes

- The app uses Expo Router for file-based routing
- Shared TypeScript code is in `/shared` folder
- API client is shared between web and mobile
- User ID is stored in AsyncStorage (mobile) or localStorage (web)

