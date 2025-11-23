import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../contexts/AuthContext';

// Screens
import LoginScreen from '../screens/LoginScreen';
import BookmarksListScreen from '../screens/BookmarksListScreen_New';
import BookmarkDetailScreen from '../screens/BookmarkDetailScreen';
import AddBookmarkScreen from '../screens/AddBookmarkScreen';

// Type definitions
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
};

export type MainStackParamList = {
  BookmarksList: { collection?: string } | undefined;
  BookmarkDetail: { id: string };
  AddBookmark: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

// Auth Navigator
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

// Main Navigator - No tabs, just immersive experience
function MainNavigator() {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen
        name="BookmarksList"
        component={BookmarksListScreen}
      />
      <MainStack.Screen
        name="BookmarkDetail"
        component={BookmarkDetailScreen}
      />
      <MainStack.Screen
        name="AddBookmark"
        component={AddBookmarkScreen}
        options={{ presentation: 'modal' }}
      />
    </MainStack.Navigator>
  );
}

// Root Navigator
export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <RootStack.Screen name="Main" component={MainNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
