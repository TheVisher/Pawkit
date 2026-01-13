'use client';

import { useEffect, useState, useRef } from 'react';
import { useDebugStore } from '@/lib/stores/debug-store';
import { CheckboxControl, MetricDisplay } from '../controls';

// Chrome-specific memory API type declaration
interface PerformanceMemory {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

interface PerformanceWithMemory extends Performance {
  memory?: PerformanceMemory;
}

/**
 * Type guard to check if performance.memory is available (Chrome only)
 */
function hasMemoryAPI(perf: Performance): perf is PerformanceWithMemory {
  return 'memory' in perf && (perf as PerformanceWithMemory).memory !== undefined;
}

interface FrameMetrics {
  fps: number;
  minFps: number;
  maxFps: number;
  frameDrops: number;
  worstFrame: number;
  avgFrameTime: number;
}

export function MetricsSection() {
  const { showFpsCounter, showFrameDrops, showCacheStats, showMemoryUsage, set } = useDebugStore();

  const [metrics, setMetrics] = useState<FrameMetrics>({
    fps: 0,
    minFps: 60,
    maxFps: 0,
    frameDrops: 0,
    worstFrame: 0,
    avgFrameTime: 0,
  });
  const [memory, setMemory] = useState<number | null>(null);

  // FPS tracking refs
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  const lastSecondRef = useRef(performance.now());
  const fpsHistoryRef = useRef<number[]>([]);

  // FPS counter using requestAnimationFrame
  useEffect(() => {
    if (!showFpsCounter) {
      // Reset when disabled
      setMetrics({
        fps: 0,
        minFps: 60,
        maxFps: 0,
        frameDrops: 0,
        worstFrame: 0,
        avgFrameTime: 0,
      });
      return;
    }

    let rafId: number;
    const FRAME_HISTORY_SIZE = 60; // Track last 60 frames
    const FPS_HISTORY_SIZE = 10; // Track last 10 seconds

    const measureFrame = (now: number) => {
      const delta = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;
      frameCountRef.current++;

      // Track frame times for analysis
      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > FRAME_HISTORY_SIZE) {
        frameTimesRef.current.shift();
      }

      // Every second, calculate metrics
      if (now - lastSecondRef.current >= 1000) {
        const currentFps = frameCountRef.current;
        frameCountRef.current = 0;
        lastSecondRef.current = now;

        // Track FPS history
        fpsHistoryRef.current.push(currentFps);
        if (fpsHistoryRef.current.length > FPS_HISTORY_SIZE) {
          fpsHistoryRef.current.shift();
        }

        // Calculate stats
        const frameTimes = frameTimesRef.current;
        const worstFrame = Math.max(...frameTimes);
        const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;

        // Count frame drops (frames > 33ms, i.e., < 30fps)
        const frameDrops = frameTimes.filter((t) => t > 33).length;

        // Min/max from history
        const fpsHistory = fpsHistoryRef.current;
        const minFps = fpsHistory.length > 0 ? Math.min(...fpsHistory) : currentFps;
        const maxFps = fpsHistory.length > 0 ? Math.max(...fpsHistory) : currentFps;

        setMetrics({
          fps: currentFps,
          minFps,
          maxFps,
          frameDrops,
          worstFrame: Math.round(worstFrame),
          avgFrameTime: Math.round(avgFrameTime * 10) / 10,
        });
      }

      rafId = requestAnimationFrame(measureFrame);
    };

    rafId = requestAnimationFrame(measureFrame);
    return () => cancelAnimationFrame(rafId);
  }, [showFpsCounter]);

  // Memory usage (Chrome only)
  useEffect(() => {
    if (!showMemoryUsage) {
      setMemory(null);
      return;
    }

    const updateMemory = () => {
      if (hasMemoryAPI(performance)) {
        const mem = performance.memory;
        if (mem) {
          setMemory(Math.round(mem.usedJSHeapSize / 1024 / 1024));
        }
      }
    };

    updateMemory();
    const interval = setInterval(updateMemory, 2000);
    return () => clearInterval(interval);
  }, [showMemoryUsage]);

  const getFpsStatus = (fps: number): 'good' | 'warning' | 'bad' => {
    if (fps >= 55) return 'good';
    if (fps >= 30) return 'warning';
    return 'bad';
  };

  const getFrameTimeStatus = (ms: number): 'good' | 'warning' | 'bad' => {
    if (ms <= 16.67) return 'good';
    if (ms <= 33) return 'warning';
    return 'bad';
  };

  return (
    <div className="space-y-3">
      {/* Toggle Controls */}
      <div className="space-y-2">
        <CheckboxControl
          label="FPS Counter"
          value={showFpsCounter}
          onChange={(v) => set('showFpsCounter', v)}
        />
        <CheckboxControl
          label="Frame Drops"
          value={showFrameDrops}
          onChange={(v) => set('showFrameDrops', v)}
        />
        <CheckboxControl
          label="Cache Stats"
          value={showCacheStats}
          onChange={(v) => set('showCacheStats', v)}
        />
        <CheckboxControl
          label="Memory Usage"
          value={showMemoryUsage}
          onChange={(v) => set('showMemoryUsage', v)}
        />
      </div>

      {/* Live Metrics */}
      {showFpsCounter && (
        <div className="space-y-1.5 pt-2 border-t border-border-default">
          <MetricDisplay
            label="FPS"
            value={metrics.fps}
            status={getFpsStatus(metrics.fps)}
            bar={(metrics.fps / 60) * 100}
          />
          <MetricDisplay
            label="Min FPS (10s)"
            value={metrics.minFps}
            status={getFpsStatus(metrics.minFps)}
          />
          <MetricDisplay
            label="Avg Frame"
            value={metrics.avgFrameTime}
            unit="ms"
            status={getFrameTimeStatus(metrics.avgFrameTime)}
          />
        </div>
      )}

      {showFrameDrops && (
        <div className="space-y-1.5 pt-2 border-t border-border-default">
          <MetricDisplay
            label="Frame Drops"
            value={metrics.frameDrops}
            status={metrics.frameDrops === 0 ? 'good' : metrics.frameDrops < 5 ? 'warning' : 'bad'}
          />
          <MetricDisplay
            label="Worst Frame"
            value={metrics.worstFrame}
            unit="ms"
            status={getFrameTimeStatus(metrics.worstFrame)}
          />
        </div>
      )}

      {showMemoryUsage && memory !== null && (
        <div className="space-y-1.5 pt-2 border-t border-border-default">
          <MetricDisplay label="JS Heap" value={memory} unit=" MB" />
        </div>
      )}

      {showCacheStats && <CacheStats />}
    </div>
  );
}

// Separate component to avoid importing layout cache store if not needed
function CacheStats() {
  const [stats, setStats] = useState({ size: 0, hits: 0, misses: 0 });

  useEffect(() => {
    // Try to get cache stats from layout cache store
    const updateStats = async () => {
      try {
        const { useLayoutCacheStore } = await import('@/lib/stores/layout-cache-store');
        const state = useLayoutCacheStore.getState();
        setStats({
          size: state.heights?.size || 0,
          hits: 0, // Would need to track this in the store
          misses: 0,
        });
      } catch {
        // Store not available
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-1.5 pt-2 border-t border-border-default">
      <MetricDisplay label="Cached Heights" value={stats.size} />
    </div>
  );
}
