import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassTheme } from '../theme/glass';

interface EdgeIndicatorsProps {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
}

export function EdgeIndicators({ leftPanelOpen, rightPanelOpen }: EdgeIndicatorsProps) {
  const leftOpacity = useRef(new Animated.Value(0.25)).current;
  const rightOpacity = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    // Very subtle pulsing animation
    const animateEdge = (opacity: Animated.Value) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.2,
            duration: 2500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animateEdge(leftOpacity);
    animateEdge(rightOpacity);
  }, []);

  return (
    <>
      {/* Left edge indicator - thin vertical line */}
      {!leftPanelOpen && (
        <Animated.View
          style={[
            styles.indicator,
            styles.leftIndicator,
            { opacity: leftOpacity },
          ]}
        >
          <LinearGradient
            colors={[
              'rgba(168, 85, 247, 0)',
              'rgba(168, 85, 247, 1)',
              'rgba(168, 85, 247, 0)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.gradientLine}
          />
        </Animated.View>
      )}

      {/* Right edge indicator - thin vertical line */}
      {!rightPanelOpen && (
        <Animated.View
          style={[
            styles.indicator,
            styles.rightIndicator,
            { opacity: rightOpacity },
          ]}
        >
          <LinearGradient
            colors={[
              'rgba(168, 85, 247, 0)',
              'rgba(168, 85, 247, 1)',
              'rgba(168, 85, 247, 0)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.gradientLine}
          />
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  indicator: {
    position: 'absolute',
    top: '50%',
    marginTop: -75, // Half of height to center
    width: 2,
    height: 150,
    zIndex: 50,
  },
  leftIndicator: {
    left: 5,
  },
  rightIndicator: {
    right: 5,
  },
  gradientLine: {
    flex: 1,
    width: 2,
  },
});
