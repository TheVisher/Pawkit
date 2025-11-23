import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Dimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Pawkit's signature animated gradient background
 * Matches the web app's aesthetic with flowing purple/pink gradients
 */
export function AnimatedBackground() {
  // Animated values for gradient position
  const gradientPosition1 = useRef(new Animated.Value(0)).current;
  const gradientPosition2 = useRef(new Animated.Value(0)).current;
  const gradientPosition3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Create flowing gradient animations
    const animation1 = Animated.loop(
      Animated.sequence([
        Animated.timing(gradientPosition1, {
          toValue: 1,
          duration: 20000,
          useNativeDriver: false,
        }),
        Animated.timing(gradientPosition1, {
          toValue: 0,
          duration: 20000,
          useNativeDriver: false,
        }),
      ])
    );

    const animation2 = Animated.loop(
      Animated.sequence([
        Animated.timing(gradientPosition2, {
          toValue: 1,
          duration: 25000,
          useNativeDriver: false,
        }),
        Animated.timing(gradientPosition2, {
          toValue: 0,
          duration: 25000,
          useNativeDriver: false,
        }),
      ])
    );

    const animation3 = Animated.loop(
      Animated.sequence([
        Animated.timing(gradientPosition3, {
          toValue: 1,
          duration: 30000,
          useNativeDriver: false,
        }),
        Animated.timing(gradientPosition3, {
          toValue: 0,
          duration: 30000,
          useNativeDriver: false,
        }),
      ])
    );

    // Start all animations
    animation1.start();
    animation2.start();
    animation3.start();

    return () => {
      animation1.stop();
      animation2.stop();
      animation3.stop();
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Base dark layer */}
      <View style={styles.baseLayer} />

      {/* Gradient Layer 1 - Purple to Dark */}
      <View style={styles.gradientLayer}>
        <LinearGradient
          colors={['#7C3AED', '#1A1A2E', '#9333EA', '#0A0A0F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, { opacity: 0.6 }]}
        />
      </View>

      {/* Gradient Layer 2 - Inverted flow */}
      <View style={styles.gradientLayer}>
        <LinearGradient
          colors={['#9333EA', '#0A0A0F', '#7C3AED', '#1A1A2E']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.gradient, { opacity: 0.4 }]}
        />
      </View>

      {/* Gradient Layer 3 - Diagonal flow */}
      <View style={styles.gradientLayer}>
        <LinearGradient
          colors={['#1A1A2E', '#7C3AED', '#0A0A0F', '#9333EA']}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, { opacity: 0.3 }]}
        />
      </View>

      {/* Radial glow overlay - centered purple glow */}
      <View style={styles.radialGlow}>
        <LinearGradient
          colors={['rgba(124, 58, 237, 0.3)', 'transparent']}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, { opacity: 0.2 }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -10,
  },
  baseLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0A0A0F',
  },
  gradientLayer: {
    position: 'absolute',
    top: -SCREEN_HEIGHT * 0.5,
    left: -SCREEN_WIDTH * 0.5,
    width: SCREEN_WIDTH * 2,
    height: SCREEN_HEIGHT * 2,
    // Note: React Native doesn't support CSS blur filters
    // The effect is achieved through opacity and overlapping layers
  },
  gradient: {
    flex: 1,
  },
  radialGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
