# Pawkit Mobile App

React Native mobile app for Pawkit, built with Expo.

## Features

- ✅ Email/password authentication via Supabase
- ✅ View bookmarks list
- ✅ View bookmark details
- ✅ Add new bookmarks (URL + basic metadata)
- ✅ View Pawkits (collections)
- ✅ Filter bookmarks by Pawkit
- ✅ Pin/unpin bookmarks
- ✅ Delete bookmarks

## Setup

### Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (for iOS development) or Android Studio (for Android)
- Expo Go app (for testing on physical devices)

### Installation

1. **Install dependencies:**
   ```bash
   cd mobile
   npm install
   ```

2. **Configure environment variables:**

   Copy `.env.template` to `.env`:
   ```bash
   cp .env.template .env
   ```

   Edit `.env` and add your configuration:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
   ```

   **Important:** For testing on physical devices, use your computer's local IP address instead of localhost:
   ```
   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:3000
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Run on a device:**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app for physical device

## Project Structure

```
mobile/
├── src/
│   ├── api/
│   │   └── client.ts          # API client for REST endpoints
│   ├── config/
│   │   ├── api.ts             # API configuration
│   │   └── supabase.ts        # Supabase client setup
│   ├── contexts/
│   │   └── AuthContext.tsx    # Authentication context
│   ├── navigation/
│   │   └── AppNavigator.tsx   # Navigation structure
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── BookmarksListScreen.tsx
│   │   ├── BookmarkDetailScreen.tsx
│   │   ├── AddBookmarkScreen.tsx
│   │   └── PawkitsScreen.tsx
│   └── types/
│       └── index.ts           # Re-exports types from ../lib/types.ts
├── App.tsx                    # Root component
├── package.json
└── .env.template              # Environment variables template
```

## API Integration

The app uses the same REST API endpoints as the web app:

- `GET /api/cards` - List bookmarks
- `POST /api/cards` - Create bookmark
- `GET /api/cards/:id` - Get bookmark details
- `PATCH /api/cards/:id` - Update bookmark
- `DELETE /api/cards/:id` - Delete bookmark
- `GET /api/pawkits` - List collections

Authentication is handled via Supabase session tokens in the `Authorization` header.

## Type Sharing

The mobile app shares TypeScript types with the web app by re-exporting from `../lib/types.ts`:

- `CardModel` - Bookmark data structure
- `CollectionNode` - Pawkit (collection) data structure
- `CardType`, `CardStatus` - Enums

## Development

### Running the App

```bash
# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on web (for debugging)
npm run web
```

### Testing with Backend

1. **Start the backend server** (in the root Pawkit directory):
   ```bash
   npm run dev
   ```

2. **Update API_BASE_URL** in `.env`:
   - For iOS Simulator: `http://localhost:3000`
   - For Android Emulator: `http://10.0.2.2:3000`
   - For Physical Device: `http://YOUR_LOCAL_IP:3000`

3. **Login** with your Supabase credentials

## Technology Stack

- **Framework:** Expo / React Native
- **Language:** TypeScript
- **Navigation:** React Navigation (Native Stack + Bottom Tabs)
- **UI Library:** React Native Paper
- **Authentication:** Supabase Auth
- **API Client:** Custom fetch-based client
- **State Management:** React Context API + useState

## Not Yet Implemented

The following features from the web app are deferred for future versions:

- ❌ Offline storage (IndexedDB/AsyncStorage)
- ❌ Metadata auto-fetching
- ❌ Full-text search
- ❌ Note editing (markdown/rich text)
- ❌ Tags management
- ❌ Bulk operations
- ❌ Import/Export
- ❌ Reader mode / article extraction
- ❌ Privacy features (encryption, private pawkits)
- ❌ User settings customization

## Troubleshooting

### Cannot connect to API

- Verify backend is running on `http://localhost:3000`
- Check `EXPO_PUBLIC_API_BASE_URL` in `.env`
- For physical devices, use your computer's local IP address
- Ensure firewall allows connections on port 3000

### Authentication fails

- Verify `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are correct
- Check Supabase dashboard for auth settings
- Ensure user exists in Supabase Auth

### Type errors

- Run `npm install` in both root and mobile directories
- Verify `../lib/types.ts` exists and is accessible
- Check TypeScript configuration in `tsconfig.json`

## License

Same as the main Pawkit project.
