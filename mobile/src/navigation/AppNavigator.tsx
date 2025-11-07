import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth } from '../contexts/AuthContext';

// Screens
import LoginScreen from '../screens/LoginScreen';
import BookmarksListScreen from '../screens/BookmarksListScreen';
import BookmarkDetailScreen from '../screens/BookmarkDetailScreen';
import AddBookmarkScreen from '../screens/AddBookmarkScreen';
import PawkitsScreen from '../screens/PawkitsScreen';

// Type definitions
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
};

export type MainTabParamList = {
  BookmarksTab: undefined;
  PawkitsTab: undefined;
};

export type BookmarksStackParamList = {
  BookmarksList: { collection?: string } | undefined;
  BookmarkDetail: { id: string };
  AddBookmark: undefined;
};

export type PawkitsStackParamList = {
  Pawkits: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const BookmarksStack = createNativeStackNavigator<BookmarksStackParamList>();
const PawkitsStack = createNativeStackNavigator<PawkitsStackParamList>();

// Auth Navigator
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

// Bookmarks Stack Navigator
function BookmarksNavigator() {
  return (
    <BookmarksStack.Navigator>
      <BookmarksStack.Screen
        name="BookmarksList"
        component={BookmarksListScreen}
        options={{ title: 'Bookmarks' }}
      />
      <BookmarksStack.Screen
        name="BookmarkDetail"
        component={BookmarkDetailScreen}
        options={{ title: 'Bookmark Details' }}
      />
      <BookmarksStack.Screen
        name="AddBookmark"
        component={AddBookmarkScreen}
        options={{ title: 'Add Bookmark', presentation: 'modal' }}
      />
    </BookmarksStack.Navigator>
  );
}

// Pawkits Stack Navigator
function PawkitsNavigator() {
  return (
    <PawkitsStack.Navigator>
      <PawkitsStack.Screen
        name="Pawkits"
        component={PawkitsScreen}
        options={{ title: 'Pawkits' }}
      />
    </PawkitsStack.Navigator>
  );
}

// Main Tab Navigator
function MainNavigator() {
  const theme = useTheme();

  return (
    <MainTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: '#999',
      }}
    >
      <MainTab.Screen
        name="BookmarksTab"
        component={BookmarksNavigator}
        options={{
          title: 'Bookmarks',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bookmark" size={size} color={color} />
          ),
        }}
      />
      <MainTab.Screen
        name="PawkitsTab"
        component={PawkitsNavigator}
        options={{
          title: 'Pawkits',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="folder" size={size} color={color} />
          ),
        }}
      />
    </MainTab.Navigator>
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
