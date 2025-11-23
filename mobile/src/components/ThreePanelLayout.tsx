import React, { ReactNode, useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SwipeableDrawer } from './SwipeableDrawer';
import { AnimatedBackground } from './AnimatedBackground';
import { EdgeIndicators } from './EdgeIndicators';
import { GlassTheme } from '../theme/glass';

interface ThreePanelLayoutProps {
  children: ReactNode;
  leftPanel?: ReactNode;
  rightPanel?: ReactNode;
}

export function ThreePanelLayout({
  children,
  leftPanel,
  rightPanel,
}: ThreePanelLayoutProps) {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  return (
    <View style={styles.container}>
      {/* Pawkit's signature animated gradient background */}
      <AnimatedBackground />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Main content area - disable interaction when panels open */}
        <View
          style={styles.content}
          pointerEvents={leftOpen || rightOpen ? 'none' : 'auto'}
        >
          {children}
        </View>

        {/* Subtle edge indicators for swipe gestures */}
        <EdgeIndicators leftPanelOpen={leftOpen} rightPanelOpen={rightOpen} />
      </SafeAreaView>

      {/* Left drawer */}
      {leftPanel && (
        <SwipeableDrawer
          side="left"
          isOpen={leftOpen}
          onOpen={() => setLeftOpen(true)}
          onClose={() => setLeftOpen(false)}
        >
          {leftPanel}
        </SwipeableDrawer>
      )}

      {/* Right drawer */}
      {rightPanel && (
        <SwipeableDrawer
          side="right"
          isOpen={rightOpen}
          onOpen={() => setRightOpen(true)}
          onClose={() => setRightOpen(false)}
        >
          {rightPanel}
        </SwipeableDrawer>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GlassTheme.colors.background,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
