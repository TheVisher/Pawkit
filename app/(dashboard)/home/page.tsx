"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { DEFAULT_USERNAME } from "@/lib/constants";
import { QuickAccessCard } from "@/components/home/quick-access-card";
import { QuickAccessPawkitCard } from "@/components/home/quick-access-pawkit-card";
import { CardModel, CollectionNode } from "@/lib/types";
import { useDataStore } from "@/lib/stores/data-store";
import { useViewSettingsStore } from "@/lib/hooks/view-settings-store";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { CardContextMenuWrapper } from "@/components/cards/card-context-menu";
import { format, addDays, startOfDay } from "date-fns";
import { isDailyNote, extractDateFromTitle, getDateString } from "@/lib/utils/daily-notes";
import { Plus, FileText, CalendarIcon } from "lucide-react";
import { GlowButton } from "@/components/ui/glow-button";
import { HorizontalScrollContainer } from "@/components/ui/horizontal-scroll-container";

const GREETINGS = [
  "Welcome back",
  "Hey there",
  "Good to see you",
  "Happy to see you",
  "Great to have you back"
];

export default function HomePage() {
  const openCardDetails = usePanelStore((state) => state.openCardDetails);
  const openHomeControls = usePanelStore((state) => state.openHomeControls);
  const activeCardId = usePanelStore((state) => state.activeCardId);

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Track if component is mounted and document.body is available (for portal rendering)
  useEffect(() => {
    // Double-check document.body exists before setting mounted
    if (typeof document !== 'undefined' && document.body) {
      setIsMounted(true);
    }
    return () => setIsMounted(false);
  }, []);

  // Read from global store - instant, no API calls
  const { cards, collections, updateCard, deleteCard, addCard } = useDataStore();

  // Open Home control panel when this page loads
  useEffect(() => {
    openHomeControls();
  }, [openHomeControls]);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const data = await response.json();
          setDisplayName(data.displayName);
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }
    };
    fetchProfile();
  }, []);

  // Build private collection IDs helper
  const privateCollectionIds = useMemo(() => {
    const ids = new Set<string>();
    const getAllCollectionIds = (nodes: any[]): void => {
      for (const node of nodes) {
        if (node.isPrivate) {
          ids.add(node.id);
        }
        if (node.children && node.children.length > 0) {
          getAllCollectionIds(node.children);
        }
      }
    };
    getAllCollectionIds(collections);
    return ids;
  }, [collections]);

  // Compute views from the single source of truth
  const recent = useMemo(() => {
    if (!cards || !Array.isArray(cards)) return [];
    return cards
      .filter(c => {
        // Skip deleted cards
        if (c.deleted === true) return false;
        const isInPrivateCollection = c.collections?.some(collectionId =>
          privateCollectionIds.has(collectionId)
        );
        return !isInPrivateCollection;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 15); // Increased from 5 to 15
  }, [cards, privateCollectionIds]);

  const quickAccess = useMemo(() => {
    if (!cards || !Array.isArray(cards)) return [];
    return cards
      .filter(c => {
        // Skip deleted cards
        if (c.deleted === true) return false;
        if (!c.pinned) return false;
        const isInPrivateCollection = c.collections?.some(collectionId =>
          privateCollectionIds.has(collectionId)
        );
        return !isInPrivateCollection;
      })
      .slice(0, 8);
  }, [cards, privateCollectionIds]);

  // Get pinned pawkits from collections (flatten tree and filter)
  const pinnedPawkits = useMemo(() => {
    if (!collections || !Array.isArray(collections)) return [];

    const flattenCollections = (nodes: CollectionNode[]): CollectionNode[] => {
      return nodes.reduce<CollectionNode[]>((acc, node) => {
        acc.push(node);
        if (node.children && Array.isArray(node.children) && node.children.length > 0) {
          acc.push(...flattenCollections(node.children));
        }
        return acc;
      }, []);
    };

    return flattenCollections(collections)
      .filter(c => c.pinned)
      .slice(0, 8);
  }, [collections]);

  // Get the week starting from Monday
  const weekDays = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day; // If Sunday (0), go back 6 days, else go to Monday
    const monday = addDays(startOfDay(now), diff);

    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, []);

  // Group cards by date
  const cardsByDate = useMemo(() => {
    const map = new Map<string, CardModel[]>();

    if (!cards || !Array.isArray(cards)) return map;

    cards
      .filter((card) => card.scheduledDate && !card.collections?.includes('the-den'))
      .forEach((card) => {
        const dateStr = card.scheduledDate!.split('T')[0];
        if (!map.has(dateStr)) {
          map.set(dateStr, []);
        }
        map.get(dateStr)!.push(card);
      });

    return map;
  }, [cards]);

  const recentIds = new Set(recent.map(card => card.id));
  let quickAccessUnique = quickAccess.filter(item => !recentIds.has(item.id));

  if (quickAccessUnique.length === 0) {
    quickAccessUnique = quickAccess;
  }

  const handleCreateQuickNote = async (date: Date) => {
    try {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

      const title = `${year}-${month}-${day} - ${dayName}`;
      const content = `# ${dayName}, ${date.toLocaleDateString('en-US', { month: 'long' })} ${day}, ${year}

## Today's Focus
- [ ]

## Notes & Thoughts
-

## Tasks
- [ ]

## Highlights
-

## Tomorrow's Plan
- [ ]

#daily #${year} #${date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase()}`;

      await addCard({
        type: 'md-note',
        title,
        content,
        tags: ['daily'],
        collections: []
      });

      // Find the newly created card from the updated store
      const dataStore = useDataStore.getState();
      const newCard = dataStore.cards.find(c => c.title === title);
      if (newCard) {
        openCardDetails(newCard.id);
        setSelectedDate(null);
      }
    } catch (error) {
      console.error('Failed to create daily note:', error);
    }
  };

  // Get cards scheduled for a specific date
  const getCardsForDate = (date: Date) => {
    if (!cards || !Array.isArray(cards)) return [];
    const dateStr = date.toISOString().split('T')[0];
    return cards.filter(card =>
      card.scheduledDate &&
      card.scheduledDate.split('T')[0] === dateStr &&
      !card.collections?.includes('the-den')
    );
  };

  // Get daily note for a specific date
  const getDailyNoteForDate = (date: Date) => {
    if (!cards || !Array.isArray(cards)) return undefined;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const title = `${year}-${month}-${day} - ${dayName}`;
    return cards.find(c => c.title === title && !c.collections?.includes('the-den'));
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-12 pb-16 min-h-full">
        <section className="relative text-center">
          <h1 className="text-4xl font-semibold text-gray-100 sm:text-5xl">
            <span className="mr-3 inline-block" aria-hidden="true">👋</span>
            {displayName ? `${greeting}, ${displayName}` : "Welcome to Pawkit!"}
          </h1>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-gray-100">Recent Items</h2>
            <Link href="/library" className="text-sm text-accent hover:text-accent/80">
              View library
            </Link>
          </div>
          {recent.length > 0 ? (
            <HorizontalScrollContainer>
              {recent.map((card) => (
                <div key={card.id} className="flex-shrink-0 w-[322px]">
                <RecentCard
                  key={card.id}
                  card={card}
                  onClick={() => openCardDetails(card.id)}
                  onAddToPawkit={async (slug) => {
                    const collections = Array.from(new Set([slug, ...(card.collections || [])]));
                    await updateCard(card.id, { collections });
                  }}
                  onDeleteCard={async () => {
                    await deleteCard(card.id);
                  }}
                  onRemoveFromPawkit={async (slug) => {
                    const collections = (card.collections || []).filter(s => s !== slug);
                    await updateCard(card.id, { collections });
                  }}
                  onRemoveFromAllPawkits={async () => {
                    await updateCard(card.id, { collections: [] });
                  }}
                />
                </div>
              ))}
            </HorizontalScrollContainer>
          ) : (
            <EmptyState message="Add your first bookmark to see it here." />
          )}
        </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-gray-100">Quick Access</h2>
          <Link href="/pawkits" className="text-sm text-accent hover:text-accent/80">
            Manage shortcuts
          </Link>
        </div>
        <HorizontalScrollContainer>
          {/* Pinned Pawkits */}
          {pinnedPawkits.map((pawkit) => (
            <div key={pawkit.id} className="flex-shrink-0 w-[250px]">
              <QuickAccessPawkitCard pawkit={pawkit} />
            </div>
          ))}

          {/* Pinned Cards */}
          {quickAccessUnique.map((item) => (
            <div key={item.id} className="flex-shrink-0 w-[250px]">
              <QuickAccessCard card={item} />
            </div>
          ))}
        </HorizontalScrollContainer>
      </section>

      <section className="mt-auto space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-gray-100">This Week</h2>
          <Link href="/calendar" className="text-sm text-accent hover:text-accent/80">
            View full calendar
          </Link>
        </div>
        <div className="max-w-[1800px] mx-auto">
          <HorizontalScrollContainer>
            {weekDays.map((day, index) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayCards = cardsByDate.get(dateStr) || [];
            const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;

            // Check if there's a daily note for this date
            const dailyNote = cards && Array.isArray(cards) ? cards.find(card => {
              if (!isDailyNote(card)) return false;
              const noteDate = extractDateFromTitle(card.title!);
              const noteDateStr = noteDate ? getDateString(noteDate) : null;
              return noteDateStr === dateStr;
            }) : undefined;

            return (
              <div
                key={dateStr}
                className={`card-hover rounded-2xl border bg-surface p-3 md:p-4 min-h-[160px] md:min-h-[200px] flex flex-col relative cursor-pointer transition-all flex-shrink-0 w-[180px] sm:w-[200px] md:w-[220px] ${
                  isToday ? 'border-accent' : 'border-subtle'
                }`}
                onClick={() => setSelectedDate(day)}
              >
                <div className="text-center mb-2 md:mb-3">
                  <p className="text-[10px] md:text-xs text-muted-foreground uppercase">
                    {format(day, 'EEE')}
                  </p>
                  <p className={`text-xl md:text-2xl font-semibold ${isToday ? 'text-accent' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </p>
                </div>
                <div className="space-y-1 md:space-y-2 flex-1">
                  {dayCards.map((card) => (
                    <button
                      key={card.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        openCardDetails(card.id);
                      }}
                      className="w-full text-left p-1.5 md:p-2 rounded-lg bg-surface-soft hover:bg-surface-soft/80 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 md:gap-2">
                        {card.image && (
                          <div className="h-6 w-6 md:h-8 md:w-8 flex-shrink-0 overflow-hidden rounded">
                            <img src={card.image} alt="" className="h-full w-full object-cover" />
                          </div>
                        )}
                        <p className="text-[10px] md:text-xs font-medium text-foreground truncate flex-1">
                          {card.title || card.domain || card.url}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Daily Note Pill or Add Button - anchored to bottom */}
                <div className="absolute bottom-2 left-2 right-2 flex justify-center">
                  {dailyNote && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openCardDetails(dailyNote.id);
                      }}
                      className="px-3 py-1.5 rounded-full bg-purple-500/20 backdrop-blur-md border border-purple-400/30 text-xs text-purple-200 hover:bg-purple-500/30 transition-colors flex items-center gap-1.5"
                    >
                      <FileText size={12} />
                      <span>Daily Note</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          </HorizontalScrollContainer>
        </div>
      </section>
      </div>

      {/* Expanded Day View Modal */}
      {selectedDate && !activeCardId && isMounted && typeof document !== 'undefined' && document.body && (() => {
        const scheduledCards = getCardsForDate(selectedDate);
        const dailyNote = getDailyNoteForDate(selectedDate);

        const modalContent = (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedDate(null)}
          >
            <div
              className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-lg p-6 w-full max-w-2xl shadow-xl max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                {scheduledCards.length + (dailyNote ? 1 : 0)} item(s) for this day
              </p>

              {/* Daily Note Section */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <CalendarIcon size={16} />
                  Daily Note
                </h3>
                {dailyNote ? (
                  <GlowButton
                    onClick={() => {
                      openCardDetails(dailyNote.id);
                      setSelectedDate(null);
                    }}
                    variant="primary"
                    className="w-full text-left p-4 rounded-xl justify-start"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="font-medium text-purple-200">{dailyNote.title}</div>
                        <div className="text-sm text-purple-300/70 mt-1">
                          {dailyNote.content?.substring(0, 100)}...
                        </div>
                      </div>
                      <div className="text-purple-300">→</div>
                    </div>
                  </GlowButton>
                ) : (
                  <GlowButton
                    onClick={() => handleCreateQuickNote(selectedDate)}
                    variant="primary"
                    className="w-full text-left p-4 rounded-xl justify-start"
                  >
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>+ Create daily note for this day</span>
                    </div>
                  </GlowButton>
                )}
              </div>

              {/* Scheduled Cards Section */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Scheduled Cards ({scheduledCards.length})
                </h3>
                {scheduledCards.length > 0 ? (
                  <div className="space-y-2">
                    {scheduledCards.map((card) => (
                      <button
                        key={card.id}
                        onClick={() => {
                          openCardDetails(card.id);
                          setSelectedDate(null);
                        }}
                        className="w-full text-left p-3 rounded-lg bg-surface-soft hover:bg-surface transition-colors border border-subtle flex items-center gap-3"
                      >
                        {card.image && (
                          <img
                            src={card.image}
                            alt=""
                            className="w-12 h-12 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate">
                            {card.title || card.domain || card.url}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {card.domain || card.url}
                          </div>
                        </div>
                        <div className="text-muted-foreground">→</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-8 border border-dashed border-subtle rounded-lg">
                    No cards scheduled for this day
                  </div>
                )}
              </div>

              {/* Close Button */}
              <div className="flex justify-end">
                <GlowButton
                  onClick={() => setSelectedDate(null)}
                  variant="primary"
                  size="md"
                >
                  Close
                </GlowButton>
              </div>
            </div>
          </div>
        );

        try {
          return createPortal(modalContent, document.body);
        } catch (error) {
          console.error('[HomePage] Failed to create portal:', error);
          return null;
        }
      })()}
    </>
  );
}

type CardProps = {
  card: CardModel;
  onClick: () => void;
  onAddToPawkit: (slug: string) => void;
  onDeleteCard: () => void;
  onRemoveFromPawkit: (slug: string) => void;
  onRemoveFromAllPawkits: () => void;
};

function RecentCard({ card, onClick, onAddToPawkit, onDeleteCard, onRemoveFromPawkit, onRemoveFromAllPawkits }: CardProps) {
  // Get display settings for home view
  const viewSettings = useViewSettingsStore((state) => state.getSettings('home'));
  const showTitles = (viewSettings as any)?.showTitles ?? true;
  const showUrls = (viewSettings as any)?.showUrls ?? true;

  const isNote = card.type === 'md-note' || card.type === 'text-note';

  return (
    <CardContextMenuWrapper
      onAddToPawkit={onAddToPawkit}
      onDelete={onDeleteCard}
      cardCollections={card.collections || []}
      onRemoveFromPawkit={onRemoveFromPawkit}
      onRemoveFromAllPawkits={onRemoveFromAllPawkits}
    >
      <article
        onClick={onClick}
        className="card-hover flex h-full cursor-pointer flex-col justify-between rounded-2xl border border-subtle bg-surface p-4 transition relative"
      >
      {/* Note icon background for notes */}
      {isNote && (
        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
          <FileText size={40} strokeWidth={1.5} className="text-purple-400" />
        </div>
      )}

      {card.image && !isNote && (
        <div className="mb-3 overflow-hidden rounded-xl bg-surface-soft relative">
          <img src={card.image} alt={card.title ?? card.url} className="h-32 w-full object-cover" loading="lazy" />
          {/* URL Pill Overlay */}
          {showUrls && card.url && (
            <a
              href={card.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-2 left-2 right-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs text-white hover:bg-black/60 transition-colors flex items-center justify-center"
            >
              <span className="truncate max-w-full">
                {card.domain || new URL(card.url).hostname}
              </span>
            </a>
          )}
        </div>
      )}
      <div className="relative z-10">
        {showTitles && (
          <>
            <p className="text-sm font-semibold text-foreground line-clamp-2" title={card.title ?? card.url}>
              {card.title || card.domain || card.url}
            </p>
            {isNote && card.content && (
              <p className="text-xs text-muted-foreground/70 line-clamp-[10] mt-1 whitespace-pre-line">
                {card.content
                  .replace(/^#{1,6}\s+/gm, '') // Remove markdown headers (# ## ### etc) but keep the text
                  .replace(/\[x\]/gi, '☑') // Convert [x] to checked checkbox
                  .replace(/\[ \]/g, '☐') // Convert [ ] to unchecked checkbox
                  .replace(/^[\s]*[-*]\s+/gm, '• ') // Convert - or * bullets to •
                  .replace(/[*_~`]/g, '') // Remove markdown formatting
                  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert [text](url) to just text
                  .trim()}
              </p>
            )}
          </>
        )}
      </div>
      <p className="mt-4 text-xs text-muted-foreground/80 relative z-10">Added {formatDate(card.createdAt)}</p>
    </article>
    </CardContextMenuWrapper>
  );
}


type EmptyStateProps = {
  message: string;
};

function EmptyState({ message }: EmptyStateProps) {
  return <p className="rounded border border-dashed border-gray-800 bg-gray-950 p-6 text-sm text-gray-500">{message}</p>;
}

function formatDate(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
