'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronUp, MessageSquare, Loader2, X, Sparkles, FileText } from 'lucide-react';
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
        background: 'var(--bg-surface-2)',
        borderLeft: '1px solid var(--border-subtle)'
      }}
    >
      {/* Close button only */}
      <div className="flex items-center justify-end px-3 py-2 shrink-0">
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg transition-all hover:scale-105"
          style={{
            color: 'var(--text-muted)',
            background: 'transparent'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-surface-3)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
          title="Close panel"
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
            <span style={{ color: 'var(--text-muted)' }}>
              Fetching transcript...
            </span>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-4 text-center">
            <span style={{ color: 'var(--text-muted)' }}>{error}</span>
          </div>
        ) : (
          <>
            {/* Collapsible Summary - Raised Container */}
            {summary && (
              <div
                className="mx-3 mt-1 mb-3 rounded-xl shrink-0"
                style={{
                  background: 'var(--bg-surface-2)',
                  boxShadow: 'var(--shadow-2)',
                  border: '1px solid var(--border-subtle)',
                  borderTopColor: 'var(--border-highlight-top)',
                  borderLeftColor: 'var(--border-highlight-left)',
                }}
              >
                {/* Collapse button - always visible */}
                <button
                  onClick={() => setSummaryCollapsed(!summaryCollapsed)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors"
                  style={{ background: 'transparent' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-surface-3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span
                    className="text-sm font-medium flex items-center gap-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <Sparkles className="w-4 h-4" style={{ color: 'var(--ds-accent)' }} />
                    Summary
                  </span>
                  {summaryCollapsed ? (
                    <ChevronDown
                      className="w-4 h-4"
                      style={{ color: 'var(--text-muted)' }}
                    />
                  ) : (
                    <ChevronUp
                      className="w-4 h-4"
                      style={{ color: 'var(--text-muted)' }}
                    />
                  )}
                </button>
                {/* Summary content - scrollable with max height */}
                {!summaryCollapsed && (
                  <div
                    className="px-4 pb-3 overflow-y-auto"
                    style={{ maxHeight: '150px' }}
                  >
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {summary}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Transcript - Inset Container */}
            <div
              className="mx-3 mb-3 rounded-xl flex-1 flex flex-col min-h-0"
              style={{
                background: 'var(--bg-surface-1)',
                boxShadow: 'var(--inset-shadow)',
                border: 'var(--inset-border)',
                borderBottomColor: 'var(--inset-border-bottom)',
                borderRightColor: 'var(--inset-border-right)',
              }}
            >
              {/* Transcript header */}
              <div className="px-4 py-2.5 shrink-0 flex items-center gap-2">
                <FileText className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Transcript
                </span>
              </div>

              {/* Transcript segments */}
              <div
                ref={transcriptRef}
                className="flex-1 overflow-y-auto px-2 pb-2"
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
                    className="flex gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200"
                    style={{
                      background: activeSegmentIndex === index
                        ? 'var(--ds-accent-subtle)'
                        : 'transparent',
                      borderLeft: activeSegmentIndex === index
                        ? '3px solid var(--ds-accent)'
                        : '3px solid transparent',
                      boxShadow: activeSegmentIndex === index
                        ? '0 0 12px var(--ds-accent-subtle)'
                        : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (activeSegmentIndex !== index) {
                        e.currentTarget.style.background = 'var(--bg-surface-2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeSegmentIndex !== index) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <span
                      className="text-xs font-mono shrink-0 pt-0.5 transition-all duration-200"
                      style={{
                        color: activeSegmentIndex === index
                          ? 'var(--ds-accent)'
                          : 'var(--text-muted)',
                        minWidth: '40px',
                        fontWeight: activeSegmentIndex === index ? 700 : 400
                      }}
                    >
                      {formatTimestamp(segment.start)}
                    </span>
                    <p
                      className="text-sm leading-relaxed transition-colors duration-200"
                      style={{
                        color: activeSegmentIndex === index
                          ? 'var(--text-primary)'
                          : 'var(--text-secondary)'
                      }}
                    >
                      {segment.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Ask Kit button - Raised Button */}
      {!loading && !error && segments.length > 0 && (
        <div className="px-3 pb-3 shrink-0">
          <button
            onClick={askKitAboutVideo}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
              boxShadow: 'var(--raised-shadow)',
              border: '1px solid transparent',
              borderTopColor: 'var(--raised-border-top)',
              color: 'var(--text-primary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = 'var(--raised-shadow), 0 0 12px var(--ds-accent-subtle)';
              e.currentTarget.style.borderColor = 'var(--ds-accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'var(--raised-shadow)';
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.borderTopColor = 'var(--raised-border-top)';
            }}
          >
            <MessageSquare className="w-4 h-4" style={{ color: 'var(--ds-accent)' }} />
            <span>Ask Kit about this video</span>
          </button>
        </div>
      )}
    </div>
  );
}
