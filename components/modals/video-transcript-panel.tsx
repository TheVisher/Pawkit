'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronUp, MessageSquare, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKitStore } from '@/lib/hooks/use-kit-store';

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

interface VideoTranscriptPanelProps {
  cardId: string;
  cardTitle: string;
  summary: string | null;
  currentTime: number;
  onSeek: (seconds: number) => void;
  onClose: () => void;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function VideoTranscriptPanel({
  cardId,
  cardTitle,
  summary,
  currentTime,
  onSeek,
  onClose
}: VideoTranscriptPanelProps) {
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const transcriptRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const lastScrollTime = useRef<number>(0);

  const { open: openKit, sendMessage } = useKitStore();

  // Fetch transcript
  useEffect(() => {
    async function fetchTranscript() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/cards/${cardId}/transcript`);
        const data = await response.json();

        if (data.segments && data.segments.length > 0) {
          setSegments(data.segments);
        } else if (data.error) {
          setError(data.error);
        } else {
          setError('No transcript available for this video');
        }
      } catch (err) {
        console.error('[Transcript] Fetch error:', err);
        setError('Failed to fetch transcript');
      } finally {
        setLoading(false);
      }
    }

    fetchTranscript();
  }, [cardId]);

  // Update active segment based on current time
  useEffect(() => {
    if (segments.length === 0) return;

    const activeIndex = segments.findIndex((seg, index) => {
      const nextSeg = segments[index + 1];
      return currentTime >= seg.start && (!nextSeg || currentTime < nextSeg.start);
    });

    if (activeIndex !== -1 && activeIndex !== activeSegmentIndex) {
      setActiveSegmentIndex(activeIndex);

      // Auto-scroll to active segment (with debounce to prevent jitter)
      if (autoScroll) {
        const now = Date.now();
        if (now - lastScrollTime.current > 500) {
          lastScrollTime.current = now;
          const segmentEl = segmentRefs.current.get(activeIndex);
          if (segmentEl && transcriptRef.current) {
            segmentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    }
  }, [currentTime, segments, activeSegmentIndex, autoScroll]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = useCallback(() => {
    // If user scrolls manually, temporarily disable auto-scroll
    setAutoScroll(false);

    // Re-enable after 5 seconds of no manual scrolling
    const timer = setTimeout(() => setAutoScroll(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Open Kit with video context
  const askKitAboutVideo = useCallback(() => {
    const transcriptText = segments.map(s => s.text).join(' ').slice(0, 8000);

    openKit();
    sendMessage(
      `I'm watching "${cardTitle}". Here's the context:\n\n` +
      (summary ? `Summary: ${summary}\n\n` : '') +
      `Transcript excerpt: ${transcriptText.slice(0, 4000)}${transcriptText.length > 4000 ? '...' : ''}\n\n` +
      `I have questions about this video.`
    );
  }, [cardTitle, summary, segments, openKit, sendMessage]);

  return (
    <div
      className="flex flex-col h-full"
      style={{
        backgroundColor: 'hsl(var(--card))',
        borderLeft: '1px solid hsl(var(--border))'
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'hsl(var(--border))' }}
      >
        <span className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>
          Transcript
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/10 transition-colors"
          style={{ color: 'hsl(var(--muted-foreground))' }}
          title="Close transcript"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4">
            <Loader2
              className="w-6 h-6 animate-spin"
              style={{ color: 'var(--ds-accent)' }}
            />
            <span style={{ color: 'hsl(var(--muted-foreground))' }}>
              Fetching transcript...
            </span>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-4 text-center">
            <span style={{ color: 'hsl(var(--muted-foreground))' }}>{error}</span>
          </div>
        ) : (
          <>
            {/* Collapsible Summary */}
            {summary && (
              <div className="border-b shrink-0" style={{ borderColor: 'hsl(var(--border))' }}>
                <button
                  onClick={() => setSummaryCollapsed(!summaryCollapsed)}
                  className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/5 transition-colors"
                >
                  <span
                    className="text-sm font-medium flex items-center gap-2"
                    style={{ color: 'hsl(var(--foreground))' }}
                  >
                    <span style={{ color: 'var(--ds-accent)' }}>✨</span>
                    Summary
                  </span>
                  {summaryCollapsed ? (
                    <ChevronDown
                      className="w-4 h-4"
                      style={{ color: 'hsl(var(--muted-foreground))' }}
                    />
                  ) : (
                    <ChevronUp
                      className="w-4 h-4"
                      style={{ color: 'hsl(var(--muted-foreground))' }}
                    />
                  )}
                </button>
                {!summaryCollapsed && (
                  <div className="px-4 pb-3">
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: 'hsl(var(--muted-foreground))' }}
                    >
                      {summary}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Transcript segments */}
            <div
              ref={transcriptRef}
              className="flex-1 overflow-y-auto p-2"
              onScroll={handleScroll}
            >
              {segments.map((segment, index) => (
                <div
                  key={index}
                  ref={(el) => {
                    if (el) segmentRefs.current.set(index, el);
                    else segmentRefs.current.delete(index);
                  }}
                  onClick={() => onSeek(segment.start)}
                  className={cn(
                    "flex gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200",
                    "hover:bg-white/5",
                    activeSegmentIndex === index && "scale-[1.01]"
                  )}
                  style={{
                    backgroundColor: activeSegmentIndex === index
                      ? 'hsl(var(--ds-accent) / 0.15)'
                      : 'transparent',
                    boxShadow: activeSegmentIndex === index
                      ? '0 0 0 1px hsl(var(--ds-accent) / 0.5)'
                      : 'none'
                  }}
                >
                  <span
                    className={cn(
                      "text-xs font-mono shrink-0 pt-0.5 transition-all duration-200"
                    )}
                    style={{
                      color: activeSegmentIndex === index
                        ? 'var(--ds-accent)'
                        : 'hsl(var(--muted-foreground))',
                      minWidth: '40px',
                      fontWeight: activeSegmentIndex === index ? 600 : 400
                    }}
                  >
                    {formatTimestamp(segment.start)}
                  </span>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'hsl(var(--foreground))' }}
                  >
                    {segment.text}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Ask Kit button */}
      {!loading && !error && segments.length > 0 && (
        <div className="p-3 border-t shrink-0" style={{ borderColor: 'hsl(var(--border))' }}>
          <button
            onClick={askKitAboutVideo}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all hover:scale-[1.02]"
            style={{
              backgroundColor: 'hsl(var(--ds-accent) / 0.15)',
              color: 'var(--ds-accent)',
              border: '1px solid hsl(var(--ds-accent) / 0.3)'
            }}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-sm font-medium">Ask Kit about this video</span>
          </button>
        </div>
      )}
    </div>
  );
}
