import React, { ReactNode } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassTheme } from '../theme/glass';

interface GlassCardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  hover?: boolean; // Whether to show purple glow on press
}

export function GlassCard({ children, onPress, style, hover = true }: GlassCardProps) {
  const content = (
    <View style={[styles.card, style]}>
      {/* Glass morphism background */}
      {Platform.OS === 'ios' ? (
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={styles.glassOverlay} />
        </BlurView>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.glassBackground]} />
      )}

      {/* Content */}
      <View style={styles.content}>{children}</View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={hover ? styles.hoverContainer : undefined}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: GlassTheme.borderRadius.xl,
    borderWidth: 1,
    borderColor: GlassTheme.colors.border.subtle,
    overflow: 'hidden',
    ...GlassTheme.shadows.glass,
  },
  glassOverlay: {
    flex: 1,
    backgroundColor: GlassTheme.colors.glass.base,
  },
  glassBackground: {
    backgroundColor: GlassTheme.colors.glass.strong,
  },
  content: {
    // No padding - let children control their own padding
  },
  hoverContainer: {
    // Purple glow on press will be added via active state
  },
});
