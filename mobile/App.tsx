import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { GlassTheme } from './src/theme/glass';
import { ShareHandler } from './src/components/ShareHandler';

// Custom dark theme matching glass morphism design
const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: GlassTheme.colors.purple[500],
    secondary: GlassTheme.colors.purple[400],
    background: GlassTheme.colors.background,
    surface: GlassTheme.colors.glass.base,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <AppNavigator />
          <ShareHandler />
          <StatusBar style="light" />
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
