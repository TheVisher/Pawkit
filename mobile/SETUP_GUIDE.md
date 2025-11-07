# Pawkit Mobile - Quick Setup Guide

## 🚀 Quick Start (5 minutes)

### 1. Install Dependencies
```bash
cd mobile
npm install
```

### 2. Configure Environment
```bash
cp .env.template .env
```

Edit `.env` and add your Supabase credentials:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

### 3. Start Backend Server
In the root Pawkit directory:
```bash
npm run dev
```

### 4. Start Mobile App
In the mobile directory:
```bash
npm start
```

Then:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go app on your phone

## 📱 Testing on Physical Devices

**Important:** If testing on a physical device, you need to use your computer's local IP address instead of `localhost`.

1. Find your computer's IP address:
   - **Mac:** System Settings → Network → Your IP
   - **Windows:** `ipconfig` in Command Prompt
   - **Linux:** `ifconfig` or `ip addr`

2. Update `.env`:
   ```env
   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:3000
   ```
   (Replace `192.168.1.100` with your actual IP)

3. Ensure your phone and computer are on the same Wi-Fi network

4. Make sure your backend server allows connections on `0.0.0.0:3000` (not just `localhost`)

## 🔑 Login Credentials

Use the same email/password credentials you use for the Pawkit web app. The mobile app uses the same Supabase authentication backend.

## 📦 What's Included

### Screens
- ✅ **Login** - Email/password authentication
- ✅ **Bookmarks List** - View all your bookmarks
- ✅ **Bookmark Detail** - View detailed bookmark info
- ✅ **Add Bookmark** - Save new URLs
- ✅ **Pawkits** - Browse your collections

### Features
- ✅ View bookmarks with metadata (title, description, image)
- ✅ Filter bookmarks by Pawkit (collection)
- ✅ Search bookmarks
- ✅ Pin/unpin bookmarks
- ✅ Delete bookmarks (soft delete)
- ✅ Pull-to-refresh
- ✅ Open URLs in browser

## 🏗️ Architecture

```
Type Sharing: Uses ../lib/types.ts from web app
Authentication: Supabase JS SDK
API Client: REST API via fetch (same endpoints as web)
Storage: AsyncStorage for auth session only
UI: React Native Paper components
Navigation: React Navigation (Stack + Bottom Tabs)
```

## 🔧 Common Issues

### "Cannot connect to server"
- Check backend is running: `npm run dev` in root directory
- Verify API_BASE_URL in `.env`
- For physical devices, use your local IP instead of localhost
- Check firewall settings

### "Network request failed"
- Android Emulator: Use `http://10.0.2.2:3000` instead of `localhost:3000`
- iOS Simulator: `http://localhost:3000` should work
- Physical Device: Use `http://YOUR_LOCAL_IP:3000`

### Type errors
- Run `npm install` in both root and mobile directories
- Ensure `../lib/types.ts` exists

## 📝 Next Steps

After getting the app running:

1. **Test core functionality:**
   - Login with your credentials
   - View existing bookmarks
   - Add a new bookmark
   - Filter by Pawkit
   - View bookmark details

2. **Customize as needed:**
   - Update theme colors in `App.tsx`
   - Add more screens in `src/screens/`
   - Extend API client in `src/api/client.ts`

3. **Future enhancements:**
   - Add offline storage (AsyncStorage + sync queue)
   - Implement search
   - Add note editing
   - Support for tags

## 📚 Documentation

- Full README: `mobile/README.md`
- Type definitions: `../lib/types.ts`
- API client: `src/api/client.ts`
- Screens: `src/screens/`

## 🆘 Help

If you run into issues:
1. Check the logs in Expo Developer Tools
2. Review the troubleshooting section in README.md
3. Verify your environment variables
4. Ensure backend API is accessible

Enjoy using Pawkit Mobile! 🐾
