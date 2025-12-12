'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';

interface YouTubePlayerProps {
  videoId: string;
  iframeId?: string; // Optional: attach to existing iframe instead of creating new one
  onTimeUpdate?: (time: number) => void;
  onReady?: () => void;
  className?: string;
}

export interface YouTubePlayerHandle {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  play: () => void;
  pause: () => void;
}

// Extend Window interface for YouTube IFrame API
declare global {
  interface Window {
    YT: {
      Player: new (
        element: HTMLElement | string,
        config: {
          videoId?: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number; target: YTPlayer }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
        BUFFERING: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  playVideo: () => void;
  pauseVideo: () => void;
  destroy: () => void;
}

// Track if API script is already loading
let apiLoadingPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (window.YT?.Player) {
    return Promise.resolve();
  }

  if (apiLoadingPromise) {
    return apiLoadingPromise;
  }

  apiLoadingPromise = new Promise((resolve) => {
    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (existingScript) {
      // Script exists, wait for API
      const checkInterval = setInterval(() => {
        if (window.YT?.Player) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      return;
    }

    // Set up callback before loading script
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve();
    };

    // Load the script
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    document.head.appendChild(tag);
  });

  return apiLoadingPromise;
}

export const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(
  ({ videoId, iframeId, onTimeUpdate, onReady, className }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<YTPlayer | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isInitializedRef = useRef(false);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        playerRef.current?.seekTo(seconds, true);
      },
      getCurrentTime: () => {
        return playerRef.current?.getCurrentTime() || 0;
      },
      play: () => {
        playerRef.current?.playVideo();
      },
      pause: () => {
        playerRef.current?.pauseVideo();
      }
    }), []);

    // Start time tracking interval
    const startTimeTracking = useCallback(() => {
      if (intervalRef.current) return;

      intervalRef.current = setInterval(() => {
        if (playerRef.current) {
          const state = playerRef.current.getPlayerState();
          // Only update when playing (state === 1)
          if (state === window.YT?.PlayerState?.PLAYING) {
            const time = playerRef.current.getCurrentTime();
            onTimeUpdate?.(time);
          }
        }
      }, 250); // Update 4x per second for smooth highlighting
    }, [onTimeUpdate]);

    // Stop time tracking
    const stopTimeTracking = useCallback(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, []);

    useEffect(() => {
      if (isInitializedRef.current) return;
      isInitializedRef.current = true;

      let mounted = true;

      async function initPlayer() {
        await loadYouTubeAPI();

        if (!mounted) return;

        // If iframeId is provided, attach to existing iframe
        // Otherwise, create a new player in the container
        const targetId = iframeId || (() => {
          if (!containerRef.current) return null;
          const containerId = `youtube-player-${videoId}-${Date.now()}`;
          containerRef.current.id = containerId;
          return containerId;
        })();

        if (!targetId) return;

        playerRef.current = new window.YT.Player(targetId, {
          ...(iframeId ? {} : { videoId }), // Only pass videoId when creating new player
          playerVars: {
            autoplay: 0,
            modestbranding: 1,
            rel: 0,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (!mounted) return;
              startTimeTracking();
              onReady?.();
            },
            onStateChange: (event) => {
              if (!mounted) return;
              // Start/stop tracking based on play state
              if (event.data === window.YT.PlayerState.PLAYING) {
                startTimeTracking();
              }
            }
          }
        });
      }

      initPlayer();

      return () => {
        mounted = false;
        stopTimeTracking();
      };
    }, [videoId, iframeId, onReady, startTimeTracking, stopTimeTracking]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        stopTimeTracking();
        if (playerRef.current) {
          try {
            // Only destroy if we created the player (not attached to existing iframe)
            if (!iframeId) {
              playerRef.current.destroy();
            }
          } catch {
            // Ignore errors during cleanup
          }
          playerRef.current = null;
        }
        isInitializedRef.current = false;
      };
    }, [iframeId, stopTimeTracking]);

    // If attaching to existing iframe, render nothing
    if (iframeId) {
      return null;
    }

    return (
      <div
        ref={containerRef}
        className={className}
        style={{ width: '100%', height: '100%' }}
      />
    );
  }
);

YouTubePlayer.displayName = 'YouTubePlayer';
