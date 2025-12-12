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
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isInitializedRef = useRef(false);
    const currentTimeRef = useRef(0);

    // For iframe mode, use postMessage to get current time
    const handleMessage = useCallback((event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com') return;

      try {
        const data = JSON.parse(event.data);
        if (data.event === 'infoDelivery' && data.info?.currentTime !== undefined) {
          currentTimeRef.current = data.info.currentTime;
          onTimeUpdate?.(data.info.currentTime);
        }
        if (data.event === 'onReady') {
          onReady?.();
        }
      } catch {
        // Not JSON, ignore
      }
    }, [onTimeUpdate, onReady]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        if (playerRef.current) {
          playerRef.current.seekTo(seconds, true);
        } else if (iframeRef.current?.contentWindow) {
          // Use postMessage for existing iframe
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] }),
            'https://www.youtube.com'
          );
        }
      },
      getCurrentTime: () => {
        if (playerRef.current) {
          return playerRef.current.getCurrentTime();
        }
        return currentTimeRef.current;
      },
      play: () => {
        if (playerRef.current) {
          playerRef.current.playVideo();
        } else if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
            'https://www.youtube.com'
          );
        }
      },
      pause: () => {
        if (playerRef.current) {
          playerRef.current.pauseVideo();
        } else if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
            'https://www.youtube.com'
          );
        }
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
        if (iframeId) {
          // Attaching to existing iframe - use postMessage API
          const iframe = document.getElementById(iframeId) as HTMLIFrameElement;
          if (!iframe) {
            console.error('[YouTubePlayer] Could not find iframe with id:', iframeId);
            return;
          }

          iframeRef.current = iframe;

          // Listen for messages from YouTube iframe
          window.addEventListener('message', handleMessage);

          // Request current time updates by listening to the iframe
          // We need to first "activate" the API by sending a listening command
          const sendListenCommand = () => {
            if (iframe.contentWindow) {
              iframe.contentWindow.postMessage(
                JSON.stringify({ event: 'listening' }),
                'https://www.youtube.com'
              );
              // Also request initial info
              iframe.contentWindow.postMessage(
                JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'] }),
                'https://www.youtube.com'
              );
            }
          };

          // Send command after a short delay to ensure iframe is ready
          setTimeout(sendListenCommand, 500);

          // Start polling for time updates (postMessage time updates can be unreliable)
          intervalRef.current = setInterval(() => {
            if (iframe.contentWindow) {
              iframe.contentWindow.postMessage(
                JSON.stringify({ event: 'command', func: 'getCurrentTime', args: [] }),
                'https://www.youtube.com'
              );
            }
          }, 250);

          if (mounted) {
            onReady?.();
          }
        } else {
          // Creating new player with YT API
          await loadYouTubeAPI();

          if (!mounted || !containerRef.current) return;

          const containerId = `youtube-player-${videoId}-${Date.now()}`;
          containerRef.current.id = containerId;

          playerRef.current = new window.YT.Player(containerId, {
            videoId,
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
                if (event.data === window.YT.PlayerState.PLAYING) {
                  startTimeTracking();
                }
              }
            }
          });
        }
      }

      initPlayer();

      return () => {
        mounted = false;
        stopTimeTracking();
        if (iframeId) {
          window.removeEventListener('message', handleMessage);
        }
      };
    }, [videoId, iframeId, onReady, startTimeTracking, stopTimeTracking, handleMessage]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        stopTimeTracking();
        window.removeEventListener('message', handleMessage);
        if (playerRef.current) {
          try {
            if (!iframeId) {
              playerRef.current.destroy();
            }
          } catch {
            // Ignore errors during cleanup
          }
          playerRef.current = null;
        }
        iframeRef.current = null;
        isInitializedRef.current = false;
      };
    }, [iframeId, stopTimeTracking, handleMessage]);

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
