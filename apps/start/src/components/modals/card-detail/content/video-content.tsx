'use client';

/**
 * Video Content Component
 * Displays embedded YouTube videos with progress tracking and transcription placeholder
 */

import { useEffect, useRef, useCallback } from 'react';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMutations } from '@/lib/contexts/convex-data-context';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { extractYouTubeVideoId } from '@/lib/utils/url-detection';
import type { Card } from '@/lib/types/convex';

// YouTube IFrame API types
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        config: {
          videoId: string;
          playerVars?: Record<string, unknown>;
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
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  pauseVideo: () => void;
  destroy: () => void;
}

interface VideoContentProps {
  card: Card;
  className?: string;
}

export function VideoContent({ card, className }: VideoContentProps) {
  const { updateCard } = useMutations();
  const videoAutoPlay = useSettingsStore((s) => s.videoAutoResume);
  const videoId = card.url ? extractYouTubeVideoId(card.url) : null;

  const playerRef = useRef<YTPlayer | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef(card.readProgress || 0);

  // Store initial progress so we don't re-init player when progress updates
  const initialProgressRef = useRef(card.readProgress || 0);
  const autoPlayRef = useRef(videoAutoPlay);

  // Update autoplay ref when setting changes (but don't reinit player)
  useEffect(() => {
    autoPlayRef.current = videoAutoPlay;
  }, [videoAutoPlay]);

  // Save progress to database
  const saveProgress = useCallback((progress: number) => {
    const updates: Record<string, unknown> = {
      readProgress: progress,
    };
    if (progress >= 95) {
      updates.isRead = true;
    }
    updateCard(card._id, updates);
  }, [card._id, updateCard]);

  // Update progress bar (visual only, no state changes)
  const updateProgress = useCallback(() => {
    if (!playerRef.current) return;

    try {
      const currentTime = playerRef.current.getCurrentTime();
      const duration = playerRef.current.getDuration();

      if (duration > 0) {
        const progress = Math.round((currentTime / duration) * 100);
        progressRef.current = progress;

        // Update DOM directly to avoid re-renders
        if (progressBarRef.current) {
          progressBarRef.current.style.width = `${progress}%`;
        }
      }
    } catch {
      // Player might not be ready yet
    }
  }, []);

  // Initialize YouTube IFrame API - only on mount/unmount
  useEffect(() => {
    if (!videoId) return;

    let isMounted = true;

    const initPlayer = () => {
      if (!isMounted || !window.YT) return;

      // Check if element exists (might have been removed)
      const element = document.getElementById(`youtube-player-${card._id}`);
      if (!element) return;

      const origin =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? undefined
          : window.location.origin;

      playerRef.current = new window.YT.Player(`youtube-player-${card._id}`, {
        videoId,
        playerVars: {
          enablejsapi: 1,
          ...(origin ? { origin } : {}),
          rel: 0,
          modestbranding: 1,
          autoplay: 0, // Never autoplay on init - we control this manually
        },
        events: {
          onReady: (event) => {
            // Always restore position
            const savedProgress = initialProgressRef.current;
            if (savedProgress > 0 && savedProgress < 95) {
              const duration = event.target.getDuration();
              if (duration > 0) {
                const seekTime = (savedProgress / 100) * duration;
                event.target.seekTo(seekTime, true);

                // After seeking, pause immediately (seekTo can trigger playback)
                // Then only play if autoplay is enabled
                setTimeout(() => {
                  if (!autoPlayRef.current) {
                    event.target.pauseVideo();
                  }
                }, 100);
              }
            }
          },
          onStateChange: (event) => {
            // Start/stop progress tracking based on player state
            if (event.data === window.YT.PlayerState.PLAYING) {
              // Clear any existing interval
              if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
              }

              // Poll for progress while playing
              progressIntervalRef.current = setInterval(() => {
                updateProgress();
              }, 250);

              // Save progress periodically (separate from visual updates)
              if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
              }
              const scheduleSave = () => {
                saveTimeoutRef.current = setTimeout(() => {
                  if (playerRef.current) {
                    saveProgress(progressRef.current);
                    scheduleSave(); // Schedule next save
                  }
                }, 5000); // Save every 5 seconds while playing
              };
              scheduleSave();

            } else {
              // Stop polling when paused/ended
              if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
              }
              if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
              }

              // Save immediately on pause (only if we have valid progress)
              if (progressRef.current > 0) {
                updateProgress();
                saveProgress(progressRef.current);
              }
            }
          },
        },
      });
    };

    // Load YouTube IFrame API if not already loaded
    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const existingScript = document.getElementById('youtube-iframe-api');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'youtube-iframe-api';
        script.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(script);
      }

      window.onYouTubeIframeAPIReady = () => {
        if (isMounted) initPlayer();
      };
    }

    return () => {
      isMounted = false;
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // Player might already be destroyed
        }
        playerRef.current = null;
      }
    };
  }, [videoId, card._id, updateProgress, saveProgress]); // Removed card.readProgress and videoAutoPlay

  if (!videoId) {
    return (
      <div className={cn('flex-1 flex items-center justify-center', className)}>
        <p className="text-text-muted">Could not load video</p>
      </div>
    );
  }

  return (
    <div className={cn('flex-1 overflow-y-auto', className)}>
      {/* Progress bar - matches article reader style */}
      <div className="sticky top-0 left-0 right-0 h-1 bg-[var(--border-subtle)] z-10">
        <div
          ref={progressBarRef}
          className="h-full bg-[var(--color-accent)] transition-[width] duration-300"
          style={{ width: `${progressRef.current}%` }}
        />
      </div>

      {/* Embedded Video */}
      <div className="px-6 pt-4">
        <div className="aspect-video rounded-lg overflow-hidden bg-black">
          <div id={`youtube-player-${card._id}`} className="w-full h-full" />
        </div>
      </div>

      {/* Transcription Section (placeholder) - no border */}
      <div className="px-6 py-8 mt-4">
        <div className="text-center text-text-muted">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Transcription coming soon</p>
        </div>
      </div>
    </div>
  );
}
