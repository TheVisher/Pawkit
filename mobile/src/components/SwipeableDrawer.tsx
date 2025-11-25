import React, { ReactNode, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
  Animated,
  PanResponder,
  PanResponderGestureState,
} from 'react-native';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.7; // 70% of screen width
const DRAWER_HEIGHT = SCREEN_HEIGHT * 0.82; // 82% of screen height
const VERTICAL_MARGIN = (SCREEN_HEIGHT - DRAWER_HEIGHT) / 2; // Center vertically
const SWIPE_THRESHOLD = DRAWER_WIDTH * 0.3; // 30% of drawer width to trigger open/close
const EDGE_WIDTH = 25; // Width of edge swipe area in pixels (20-30px for native iOS feel)

export type DrawerSide = 'left' | 'right';

interface SwipeableDrawerProps {
  children: ReactNode;
  side: DrawerSide;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export function SwipeableDrawer({
  children,
  side,
  isOpen,
  onOpen,
  onClose,
}: SwipeableDrawerProps) {
  // Animated value for drawer position
  const translateX = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Update position when isOpen prop changes
  useEffect(() => {
    const targetValue = isOpen ? (side === 'left' ? DRAWER_WIDTH : -DRAWER_WIDTH) : 0;

    // Smooth 300ms animation for drawer slide
    Animated.timing(translateX, {
      toValue: targetValue,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Smooth 300ms animation for backdrop
    Animated.timing(backdropOpacity, {
      toValue: isOpen ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOpen, side]);

  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        // Check if touch starts within edge area when closed
        if (!isOpen) {
          const touchX = evt.nativeEvent.pageX;

          if (side === 'left') {
            return touchX < EDGE_WIDTH;
          } else {
            return touchX > SCREEN_WIDTH - EDGE_WIDTH;
          }
        }
        return false;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal swipes
        const isHorizontalSwipe = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;

        if (!isHorizontalSwipe) return false;

        // When drawer is closed, only respond to swipes from edge
        if (!isOpen) {
          const touchX = evt.nativeEvent.pageX;
          if (side === 'left') {
            // Left drawer: only respond if touch starts near left edge
            return touchX < EDGE_WIDTH;
          } else {
            // Right drawer: only respond if touch starts near right edge
            return touchX > SCREEN_WIDTH - EDGE_WIDTH;
          }
        }

        // When drawer is open, respond to any horizontal swipe
        return true;
      },
      onPanResponderGrant: () => {
        // Set offset to current value when gesture starts
        translateX.setOffset((translateX as any)._value);
      },
      onPanResponderMove: (_, gestureState: PanResponderGestureState) => {
        if (side === 'left') {
          // Left drawer: swipe right to open, left to close
          if (isOpen) {
            // When open, allow swiping left to close (negative dx)
            const newValue = Math.max(0, Math.min(DRAWER_WIDTH, gestureState.dx));
            translateX.setValue(newValue);
          } else {
            // When closed, allow swiping right from edge to open (positive dx)
            const newValue = Math.max(0, Math.min(DRAWER_WIDTH, gestureState.dx));
            translateX.setValue(newValue);
          }
        } else {
          // Right drawer: swipe left to open, right to close
          if (isOpen) {
            // When open, allow swiping right to close (positive dx)
            const newValue = Math.max(-DRAWER_WIDTH, Math.min(0, gestureState.dx));
            translateX.setValue(newValue);
          } else {
            // When closed, allow swiping left from edge to open (negative dx)
            const newValue = Math.max(-DRAWER_WIDTH, Math.min(0, gestureState.dx));
            translateX.setValue(newValue);
          }
        }

        // Update backdrop opacity based on position (0 to 1)
        const opacity = Math.abs((translateX as any)._value + (translateX as any)._offset) / DRAWER_WIDTH;
        backdropOpacity.setValue(opacity);
      },
      onPanResponderRelease: (_, gestureState: PanResponderGestureState) => {
        translateX.flattenOffset();

        const currentValue = (translateX as any)._value;

        if (side === 'left') {
          const shouldOpen = currentValue > SWIPE_THRESHOLD;
          if (shouldOpen && !isOpen) {
            onOpen();
          } else if (!shouldOpen && isOpen) {
            onClose();
          } else {
            // Snap back to current state
            Animated.parallel([
              Animated.timing(translateX, {
                toValue: isOpen ? DRAWER_WIDTH : 0,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(backdropOpacity, {
                toValue: isOpen ? 1 : 0,
                duration: 300,
                useNativeDriver: true,
              }),
            ]).start();
          }
        } else {
          const shouldOpen = currentValue < -SWIPE_THRESHOLD;
          if (shouldOpen && !isOpen) {
            onOpen();
          } else if (!shouldOpen && isOpen) {
            onClose();
          } else {
            // Snap back to current state
            Animated.parallel([
              Animated.timing(translateX, {
                toValue: isOpen ? -DRAWER_WIDTH : 0,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(backdropOpacity, {
                toValue: isOpen ? 1 : 0,
                duration: 300,
                useNativeDriver: true,
              }),
            ]).start();
          }
        }
      },
    })
  ).current;

  // Transform for drawer - start off-screen
  const drawerTransform = side === 'left'
    ? { transform: [{ translateX: Animated.add(translateX, -DRAWER_WIDTH) }] }
    : { transform: [{ translateX: Animated.add(translateX, DRAWER_WIDTH) }] };

  return (
    <>
      {/* Edge swipe zone - invisible but captures edge swipes when drawer is closed */}
      {!isOpen && (
        <View
          {...panResponder.panHandlers}
          style={[
            styles.edgeZone,
            side === 'left' ? styles.edgeZoneLeft : styles.edgeZoneRight,
          ]}
        />
      )}

      {/* Backdrop - with blur and dim */}
      {isOpen && (
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropOpacity,
            },
          ]}
        >
          {Platform.OS === 'ios' ? (
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
              <TouchableWithoutFeedback onPress={onClose}>
                <View style={[StyleSheet.absoluteFill, styles.backdropDim]} />
              </TouchableWithoutFeedback>
            </BlurView>
          ) : (
            <TouchableWithoutFeedback onPress={onClose}>
              <View style={[StyleSheet.absoluteFill, styles.backdropDimAndroid]} />
            </TouchableWithoutFeedback>
          )}
        </Animated.View>
      )}

      {/* Drawer - always rendered but off-screen when closed */}
      <Animated.View
        {...(isOpen ? panResponder.panHandlers : {})}
        style={[
          styles.drawer,
          side === 'left' ? styles.drawerLeft : styles.drawerRight,
          drawerTransform,
        ]}
        pointerEvents={isOpen ? 'box-none' : 'none'}
      >
        {children}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  edgeZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: EDGE_WIDTH * 2, // Make it a bit wider to be easier to trigger
    zIndex: 99,
  },
  edgeZoneLeft: {
    left: 0,
  },
  edgeZoneRight: {
    right: 0,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  backdropDim: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  backdropDimAndroid: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  drawer: {
    position: 'absolute',
    top: VERTICAL_MARGIN,
    height: DRAWER_HEIGHT,
    width: DRAWER_WIDTH,
    zIndex: 101,
    borderRadius: 16,
  },
  drawerLeft: {
    left: 0,
  },
  drawerRight: {
    right: 0,
  },
});
