'use client';

/**
 * FLIP Animation Hook for Content Panel
 * Animates the panel from the card's origin position to its final position
 */

import { useRef, useLayoutEffect, useState, useMemo, useEffect } from 'react';
import { useModalStore } from '@/lib/stores/modal-store';

// Smooth easing that matches sidebar transitions
const FLIP_EASING = [0.4, 0, 0.2, 1] as const;
const FLIP_DURATION = 0.5; // seconds

// Animation phases
type AnimationPhase = 'initial' | 'animating' | 'complete' | 'closing';

interface AnimationState {
  phase: AnimationPhase;
  initialTransform: string;
  closeTransform: string;
}

interface UseContentPanelAnimationReturn {
  panelRef: React.RefObject<HTMLDivElement | null>;
  isAnimating: boolean;
  animationStyles: React.CSSProperties;
  backdropOpacity: number;
  startCloseAnimation: (callback?: () => void) => void;
}

export function useContentPanelAnimation(): UseContentPanelAnimationReturn {
  const panelRef = useRef<HTMLDivElement>(null);
  const [animState, setAnimState] = useState<AnimationState>({ phase: 'complete', initialTransform: '', closeTransform: '' });
  const [backdropOpacity, setBackdropOpacity] = useState(1);
  const closeCallbackRef = useRef<(() => void) | null>(null);

  const cardOriginRect = useModalStore((s) => s.cardOriginRect);
  const isAnimating = useModalStore((s) => s.isAnimating);
  const setIsAnimating = useModalStore((s) => s.setIsAnimating);

  // Helper to calculate transform to card position
  const calculateTransformToCard = (panelRect: DOMRect, originRect: DOMRect): string => {
    const scaleX = originRect.width / panelRect.width;
    const scaleY = originRect.height / panelRect.height;
    const originCenterX = originRect.left + originRect.width / 2;
    const originCenterY = originRect.top + originRect.height / 2;
    const panelCenterX = panelRect.left + panelRect.width / 2;
    const panelCenterY = panelRect.top + panelRect.height / 2;
    const translateX = originCenterX - panelCenterX;
    const translateY = originCenterY - panelCenterY;
    return `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
  };

  // Calculate and apply FLIP animation on open
  useLayoutEffect(() => {
    if (!cardOriginRect || !panelRef.current) {
      setAnimState({ phase: 'complete', initialTransform: '', closeTransform: '' });
      setBackdropOpacity(1);
      return;
    }

    const panelRect = panelRef.current.getBoundingClientRect();
    const initialTransform = calculateTransformToCard(panelRect, cardOriginRect);

    // Phase 1: Set initial state (panel at card position, no transition)
    setAnimState({ phase: 'initial', initialTransform, closeTransform: initialTransform });
    setBackdropOpacity(0);

  }, [cardOriginRect]);

  // Phase 2: Trigger animation after initial state is painted
  useEffect(() => {
    if (animState.phase !== 'initial') return;

    // Force a reflow to ensure the initial state is painted
    if (panelRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      panelRef.current.offsetHeight;
    }

    // Use RAF to ensure we're in a new frame
    const rafId = requestAnimationFrame(() => {
      setAnimState(prev => ({ ...prev, phase: 'animating' }));
      setBackdropOpacity(1);

      // Mark animation complete after duration
      setTimeout(() => {
        setAnimState(prev => ({ ...prev, phase: 'complete' }));
        setIsAnimating(false);
      }, FLIP_DURATION * 1000);
    });

    return () => cancelAnimationFrame(rafId);
  }, [animState.phase, setIsAnimating]);

  // Build animation styles based on phase
  const animationStyles = useMemo((): React.CSSProperties => {
    const { phase, initialTransform, closeTransform } = animState;

    if (phase === 'initial') {
      // Start at card position, no transition, invisible
      return {
        transform: initialTransform,
        opacity: 0,
        transition: 'none',
        willChange: 'transform, opacity',
      };
    }

    if (phase === 'animating') {
      // Animate to final position (opening)
      return {
        transform: 'none',
        opacity: 1,
        transition: `transform ${FLIP_DURATION}s cubic-bezier(${FLIP_EASING.join(',')}), opacity ${FLIP_DURATION}s cubic-bezier(${FLIP_EASING.join(',')})`,
        willChange: 'transform, opacity',
      };
    }

    if (phase === 'closing') {
      // Animate back to card position
      return {
        transform: closeTransform,
        opacity: 0,
        transition: `transform ${FLIP_DURATION}s cubic-bezier(${FLIP_EASING.join(',')}), opacity ${FLIP_DURATION}s cubic-bezier(${FLIP_EASING.join(',')})`,
        willChange: 'transform, opacity',
      };
    }

    // Complete - no transform, no transition overhead
    return {
      transform: 'none',
      opacity: 1,
    };
  }, [animState]);

  // Close animation - reverse FLIP back to origin
  const startCloseAnimation = (callback?: () => void) => {
    if (!cardOriginRect || !panelRef.current) {
      callback?.();
      return;
    }

    // Store callback to call after animation
    closeCallbackRef.current = callback || null;

    // Calculate current transform to card (card may have scrolled)
    const panelRect = panelRef.current.getBoundingClientRect();
    const closeTransform = calculateTransformToCard(panelRect, cardOriginRect);

    // Trigger closing phase
    setAnimState(prev => ({ ...prev, phase: 'closing', closeTransform }));
    setBackdropOpacity(0);

    // Call callback after animation duration
    setTimeout(() => {
      if (closeCallbackRef.current) {
        closeCallbackRef.current();
        closeCallbackRef.current = null;
      }
    }, FLIP_DURATION * 1000);
  };

  return {
    panelRef,
    isAnimating,
    animationStyles,
    backdropOpacity,
    startCloseAnimation,
  };
}
