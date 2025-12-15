# Pawkit Home View Redesign - Implementation Spec

> **Purpose:** Redesign the Home dashboard with a masonry-style layout featuring new widgets
> **Priority:** High
> **Estimated Scope:** Medium (mostly UI, some new data patterns)

---

## Overview

Replace the current Home view with a more visually engaging masonry-style layout featuring:

1. **Today** — Events, Scheduled items, Todos in one unified card
2. **This Week Calendar** — Week view replacing the old calendar widget
3. **Inbox** — NEW: Unprocessed items that need organizing
4. **Rediscover** — Nudge card for old items (already exists, repositioned)
5. **Pinned Pawkits** — With thumbnail previews
6. **Recent Items** — Grid of recently saved items
7. **Right Sidebar** — Stats, Continue reading, On This Day

---

## Layout Structure

```
┌────────────────────────────────────────────────────────┬──────────────────┐
│  HEADER                                                │                  │
│  ☀️ Sunday, December 14                                │                  │
│  Good afternoon, Erik                                  │                  │
├────────────────────────────────────┬───────────────────┤   THIS WEEK      │
│                                    │                   │   STATS          │
│            TODAY                   │    THIS WEEK      │   ┌────┬────┐    │
│  ┌──────────┬─────────┬─────────┐  │    CALENDAR       │   │ 18 │ 23 │    │
│  │ Events   │Scheduled│  Todos  │  │                   │   │save│proc│    │
│  │          │         │         │  │   Mon  9   —      │   └────┴────┘    │
│  └──────────┴─────────┴─────────┘  │   Tue  10  —      │   🔥 5-day       │
│  [ Open today's note ]             │   Wed  11  📷     │                  │
│                                    │   Thu  12  —      ├──────────────────┤
├──────────────────┬─────────────────┤   Fri  13  📷     │                  │
│                  │                 │   Sat  14  ← today│   CONTINUE       │
│     INBOX        │   REDISCOVER    │   Sun  15  —      │   reading...     │
│     📥 8         │   🔄 47 items   │                   │                  │
│   to organize    │   from 2+ mo    │   [Full calendar] │   ━━━━━░░ 65%    │
│                  │                 │                   │                  │
│   [Process →]    │   [Start →]     │                   ├──────────────────┤
│                  │                 │                   │                  │
├──────────────────┴─────────────────┴───────────────────┤   ON THIS DAY    │
│                                                        │   1 year ago...  │
│   PINNED PAWKITS                      [Manage →]       │                  │
│   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │                  │
│   │ D  Design   │ │ W  Work     │ │ R  Recipes  │      │                  │
│   │ 24 items    │ │ 12 items    │ │ 8 items     │      │                  │
│   │ [img][img]  │ │ [img][img]  │ │ [img][img]  │      │                  │
│   └─────────────┘ └─────────────┘ └─────────────┘      │                  │
│                                                        │                  │
├────────────────────────────────────────────────────────┤                  │
│                                                        │                  │
│   RECENT ITEMS                           [View all →]  │   ⌘K to search   │
│   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │                  │
│   │  img   │ │  img   │ │  img   │ │  img   │          │                  │
│   │ Title  │ │ Title  │ │ Title  │ │ Title  │          │                  │
│   │ domain │ │ domain │ │ domain │ │ domain │          │                  │
│   └────────┘ └────────┘ └────────┘ └────────┘          │                  │
│                                                        │                  │
└────────────────────────────────────────────────────────┴──────────────────┘
```

---

## Grid System

Use CSS Grid with a 3-column layout for the main content:

```tsx
// Main content area
<div className="grid grid-cols-3 gap-3 auto-rows-min">
  {/* Today: spans 2 columns */}
  <div className="col-span-2">...</div>
  
  {/* Calendar: spans 2 rows */}
  <div className="row-span-2">...</div>
  
  {/* Inbox: 1 column */}
  <div>...</div>
  
  {/* Rediscover: 1 column */}
  <div>...</div>
  
  {/* Pinned Pawkits: full width */}
  <div className="col-span-3">...</div>
  
  {/* Recent: full width */}
  <div className="col-span-3">...</div>
</div>
```

---

## Component Specifications

### 1. Header

```tsx
<div className="mb-5">
  <div className="flex items-center gap-1.5 text-zinc-500 text-xs mb-0.5">
    <GreetingIcon className="w-3.5 h-3.5" />
    <span>{formatDate()}</span> {/* "Sunday, December 14" */}
  </div>
  <h1 className="text-2xl font-semibold">
    {getGreeting()}, <span className="text-purple-400">{userName}</span>
  </h1>
</div>
```

**Greeting logic:**
- Before 12pm: "Good morning" + Coffee icon
- 12pm-5pm: "Good afternoon" + Sun icon  
- After 5pm: "Good evening" + Moon icon

---

### 2. Today Card

**Data sources:**
- `events`: From calendar events API (today only)
- `scheduled`: Cards with `scheduledFor` = today
- `todos`: From todos API (user's todos)

**Sub-sections (3 columns inside the card):**

| Section | Icon | Content |
|---------|------|---------|
| Events | Clock | List of today's calendar events with colored bars |
| Scheduled | Bookmark | Cards scheduled for today |
| Todos | CheckSquare | Interactive todo checkboxes |

**Footer:** "Open today's note" button → navigates to daily note

```tsx
// Events sub-panel
<div className="bg-zinc-800/60 rounded-lg p-3">
  <div className="flex items-center gap-1.5 mb-2">
    <Clock className="w-3.5 h-3.5 text-zinc-400" />
    <span className="text-xs text-zinc-400">Events</span>
  </div>
  {events.map(event => (
    <div className="flex items-center gap-2">
      <div 
        className="w-0.5 h-5 rounded-full" 
        style={{ backgroundColor: event.color }} 
      />
      <div>
        <p className="text-xs font-medium">{event.title}</p>
        <p className="text-[10px] text-zinc-500">{event.time}</p>
      </div>
    </div>
  ))}
</div>
```

---

### 3. This Week Calendar

**Data sources:**
- Week days array (Mon-Sun of current week)
- Cards/events scheduled for each day

**Behavior:**
- Highlight today with purple border: `bg-purple-500/10 border border-purple-500/30`
- Show thumbnail + title for days with scheduled items
- Show "—" for empty days
- "Full calendar" link at bottom

```tsx
{weekDays.map(day => (
  <div className={`flex items-center gap-2 py-2 px-2 rounded-lg ${
    day.isToday 
      ? 'bg-purple-500/10 border border-purple-500/30' 
      : 'hover:bg-zinc-800/50'
  }`}>
    <div className="w-10 text-center">
      <p className={`text-[10px] ${day.isToday ? 'text-purple-400' : 'text-zinc-500'}`}>
        {day.dayName}
      </p>
      <p className={`text-sm font-semibold ${day.isToday ? 'text-purple-400' : 'text-white'}`}>
        {day.date}
      </p>
    </div>
    <div className="flex-1">
      {day.items.length > 0 ? (
        <div className="flex items-center gap-2">
          {day.items[0].thumbnail && (
            <img src={day.items[0].thumbnail} className="w-6 h-6 rounded" />
          )}
          <span className="text-xs truncate">{day.items[0].title}</span>
        </div>
      ) : (
        <span className="text-xs text-zinc-600">—</span>
      )}
    </div>
  </div>
))}
```

---

### 4. Inbox (NEW)

**Concept:** Items that have been saved but not yet organized (no tags, no pawkit, not scheduled).

**Data source:** Query cards where:
```sql
-- Pseudo-query for inbox items
SELECT * FROM cards 
WHERE userId = :userId
  AND collections = '[]' OR collections IS NULL
  AND tags = '[]' OR tags IS NULL  
  AND scheduledFor IS NULL
  AND isArchived = false
  AND type = 'url' -- or include notes too
ORDER BY createdAt DESC
```

**States:**

1. **Has items:**
   - Show count prominently
   - Preview 2 most recent items
   - "+X more" if more than 2
   - "Process →" button

2. **Empty (Inbox Zero):**
   - Celebration state with sparkles
   - "All caught up! 🎉"

```tsx
// Inbox with items
<div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
  <div className="flex items-center gap-2 mb-3">
    <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
      <Inbox className="w-3.5 h-3.5 text-blue-400" />
    </div>
    <h2 className="font-semibold text-sm">Inbox</h2>
  </div>
  
  <div className="flex items-baseline gap-1.5 mb-3">
    <span className="text-3xl font-bold text-blue-400">{inboxCount}</span>
    <span className="text-xs text-zinc-500">to organize</span>
  </div>
  
  {/* Preview items */}
  <div className="space-y-1.5 mb-3">
    {inboxItems.slice(0, 2).map(item => (
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <div className="w-1 h-1 rounded-full bg-blue-400" />
        <span className="truncate flex-1">{item.title}</span>
        <span className="text-[10px] text-zinc-600">{formatRelativeTime(item.createdAt)}</span>
      </div>
    ))}
    {inboxCount > 2 && (
      <p className="text-[10px] text-zinc-600 pl-3">+{inboxCount - 2} more</p>
    )}
  </div>

  <button className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/30">
    Process <ArrowRight className="w-3.5 h-3.5" />
  </button>
</div>

// Empty inbox
<div className="text-center py-4">
  <Sparkles className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
  <p className="text-xs text-zinc-400">All caught up!</p>
  <p className="text-[10px] text-zinc-600">You've organized everything</p>
</div>
```

**"Process" action:** Navigate to a filtered view showing only inbox items, or open a triage modal.

---

### 5. Rediscover Card

Already exists — just repositioned. Keep the gradient background:

```tsx
<div className="bg-gradient-to-br from-purple-500/15 to-cyan-500/15 rounded-xl p-4 border border-purple-500/30 relative">
```

Make it dismissible with X button (stores preference in localStorage).

---

### 6. Pinned Pawkits

**Data source:** Pinned collections from existing API

**Enhanced display:** Show thumbnail previews from first 2 items in each pawkit.

```tsx
<div className="col-span-3 bg-zinc-900 rounded-xl p-4 border border-zinc-800">
  <div className="flex items-center justify-between mb-3">
    <h2 className="font-semibold">Pinned Pawkits</h2>
    <button className="text-xs text-zinc-500 hover:text-purple-400">
      Manage shortcuts <ChevronRight />
    </button>
  </div>
  
  <div className="grid grid-cols-3 gap-3">
    {pinnedPawkits.map(pawkit => (
      <button className="group bg-zinc-800/50 rounded-xl p-3 text-left hover:bg-zinc-800 border border-transparent hover:border-purple-500/20">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold"
              style={{ backgroundColor: pawkit.color + '25', color: pawkit.color }}
            >
              {pawkit.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-medium text-sm">{pawkit.name}</h3>
              <p className="text-[10px] text-zinc-500">{pawkit.count} items</p>
            </div>
          </div>
        </div>
        
        {/* Thumbnail previews */}
        <div className="flex gap-1.5">
          {pawkit.previewItems.slice(0, 2).map(item => (
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-700">
              <img src={item.thumbnail} className="w-full h-full object-cover" />
            </div>
          ))}
          {pawkit.count > 2 && (
            <div className="w-12 h-12 rounded-lg bg-zinc-700/50 flex items-center justify-center text-[10px] text-zinc-500">
              +{pawkit.count - 2}
            </div>
          )}
        </div>
      </button>
    ))}
  </div>
</div>
```

---

### 7. Recent Items

Existing functionality, just styled as a grid:

```tsx
<div className="grid grid-cols-4 gap-3">
  {recentItems.map(item => (
    <button className="group text-left bg-zinc-800/50 rounded-xl overflow-hidden hover:ring-1 hover:ring-purple-500/30">
      <div className="aspect-video overflow-hidden">
        <img 
          src={item.thumbnail} 
          className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all" 
        />
      </div>
      <div className="p-2.5">
        <h3 className="text-xs font-medium line-clamp-1">{item.title}</h3>
        <p className="text-[10px] text-zinc-500">{item.domain}</p>
      </div>
    </button>
  ))}
</div>
```

---

## Right Sidebar Components

### 1. This Week Stats

```tsx
<div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
  <div className="flex items-center gap-2 mb-3">
    <div className="w-7 h-7 rounded-lg bg-pink-500/20 flex items-center justify-center">
      <TrendingUp className="w-3.5 h-3.5 text-pink-400" />
    </div>
    <h2 className="font-semibold text-sm">This Week</h2>
  </div>
  
  <div className="grid grid-cols-2 gap-2 mb-3">
    <div className="bg-zinc-800/50 rounded-lg p-2.5 text-center">
      <p className="text-xl font-bold">{savedThisWeek}</p>
      <p className="text-[10px] text-zinc-500">Saved</p>
    </div>
    <div className="bg-zinc-800/50 rounded-lg p-2.5 text-center">
      <p className="text-xl font-bold">{processedThisWeek}</p>
      <p className="text-[10px] text-zinc-500">Processed</p>
    </div>
  </div>
  
  {streak > 0 && (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-orange-500/10">
      <Flame className="w-4 h-4 text-orange-400" />
      <span className="text-xs text-orange-400 font-medium">{streak}-day streak!</span>
    </div>
  )}
</div>
```

**Data:**
- `savedThisWeek`: Count of cards created this week
- `processedThisWeek`: Count of cards that left inbox this week (got tagged/organized)
- `streak`: Consecutive days with saves (optional, can implement later)

---

### 2. Continue Reading

Shows last opened items with reading progress.

**Requires:** Tracking `lastOpenedAt` and optionally `readingProgress` on cards.

```tsx
<div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
  <div className="flex items-center gap-2 mb-3">
    <div className="w-7 h-7 rounded-lg bg-green-500/20 flex items-center justify-center">
      <ExternalLink className="w-3.5 h-3.5 text-green-400" />
    </div>
    <h2 className="font-semibold text-sm">Continue</h2>
  </div>
  
  <div className="space-y-2">
    {continueItems.map(item => (
      <button className="w-full text-left p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 group">
        <p className="text-xs font-medium line-clamp-1 mb-1 group-hover:text-purple-400">
          {item.title}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-500">{item.domain}</span>
          <span className="text-[10px] text-zinc-500">{item.progress}%</span>
        </div>
        <div className="mt-1.5 h-0.5 bg-zinc-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 rounded-full"
            style={{ width: `${item.progress}%` }}
          />
        </div>
      </button>
    ))}
  </div>
</div>
```

**Fallback:** If no reading progress tracking, just show last 2 opened items without progress bar.

---

### 3. On This Day

Shows items saved exactly 1 year ago.

```tsx
<div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
  <div className="flex items-center gap-2 mb-3">
    <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
      <span className="text-sm">📅</span>
    </div>
    <h2 className="font-semibold text-sm">On This Day</h2>
  </div>
  
  {onThisDayItem ? (
    <>
      <p className="text-xs text-zinc-400 mb-2">1 year ago you saved:</p>
      <button className="w-full text-left p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 group">
        <p className="text-xs font-medium line-clamp-2 group-hover:text-amber-400">
          {onThisDayItem.title}
        </p>
        <p className="text-[10px] text-zinc-500 mt-1">{onThisDayItem.domain}</p>
      </button>
    </>
  ) : (
    <p className="text-xs text-zinc-600">Nothing saved on this day last year</p>
  )}
</div>
```

**Query:**
```sql
SELECT * FROM cards 
WHERE userId = :userId
  AND createdAt >= :oneYearAgoStart
  AND createdAt < :oneYearAgoEnd
LIMIT 1
```

---

## Data Fetching Strategy

Create a dedicated hook or combine existing hooks:

```tsx
// hooks/use-home-data.ts
export function useHomeData() {
  const { user } = useAuth();
  
  // Existing data
  const { cards } = useCards();
  const { collections } = useCollections();
  const { todos } = useTodos();
  const { events } = useCalendarEvents();
  
  // Computed data
  const inboxItems = useMemo(() => {
    return cards.filter(card => 
      (!card.collections || card.collections.length === 0) &&
      (!card.tags || card.tags.length === 0) &&
      !card.scheduledFor &&
      !card.isArchived
    );
  }, [cards]);
  
  const recentItems = useMemo(() => {
    return [...cards]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8);
  }, [cards]);
  
  const pinnedPawkits = useMemo(() => {
    return collections
      .filter(c => c.isPinned)
      .map(c => ({
        ...c,
        previewItems: cards
          .filter(card => card.collections?.includes(c.slug))
          .slice(0, 2)
      }));
  }, [collections, cards]);
  
  const todayEvents = useMemo(() => {
    const today = new Date().toDateString();
    return events.filter(e => new Date(e.date).toDateString() === today);
  }, [events]);
  
  const scheduledForToday = useMemo(() => {
    const today = new Date().toDateString();
    return cards.filter(c => 
      c.scheduledFor && new Date(c.scheduledFor).toDateString() === today
    );
  }, [cards]);
  
  // Stats
  const thisWeekStats = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const savedThisWeek = cards.filter(c => 
      new Date(c.createdAt) > weekAgo
    ).length;
    
    // Processed = has tags OR has collections (and was created this week)
    const processedThisWeek = cards.filter(c => 
      new Date(c.createdAt) > weekAgo &&
      ((c.tags && c.tags.length > 0) || (c.collections && c.collections.length > 0))
    ).length;
    
    return { savedThisWeek, processedThisWeek };
  }, [cards]);
  
  // On This Day
  const onThisDayItem = useMemo(() => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const dayStart = new Date(oneYearAgo.setHours(0, 0, 0, 0));
    const dayEnd = new Date(oneYearAgo.setHours(23, 59, 59, 999));
    
    return cards.find(c => {
      const created = new Date(c.createdAt);
      return created >= dayStart && created <= dayEnd;
    });
  }, [cards]);
  
  return {
    inboxItems,
    inboxCount: inboxItems.length,
    recentItems,
    pinnedPawkits,
    todayEvents,
    scheduledForToday,
    todos,
    thisWeekStats,
    onThisDayItem,
  };
}
```

---

## File Structure

```
app/(dashboard)/home/
├── page.tsx              # Main Home page
├── components/
│   ├── home-header.tsx   # Greeting header
│   ├── today-card.tsx    # Today section with Events/Scheduled/Todos
│   ├── week-calendar.tsx # This Week calendar
│   ├── inbox-card.tsx    # NEW: Inbox widget
│   ├── rediscover-card.tsx # Rediscover nudge
│   ├── pinned-pawkits.tsx # Pinned collections
│   ├── recent-items.tsx  # Recent items grid
│   └── sidebar/
│       ├── stats-card.tsx      # This Week stats
│       ├── continue-card.tsx   # Continue reading
│       └── on-this-day.tsx     # On This Day
└── hooks/
    └── use-home-data.ts  # Combined data hook
```

---

## Styling Notes

- Use existing Pawkit design system variables where possible
- Background: `bg-zinc-900` for cards, `bg-zinc-950` for page
- Borders: `border border-zinc-800`
- Accent colors by widget:
  - Today: Purple (`bg-purple-500/20`, `text-purple-400`)
  - Calendar: Blue (`bg-blue-500/20`, `text-blue-400`)
  - Inbox: Blue (`bg-blue-500/20`, `text-blue-400`)
  - Rediscover: Purple gradient
  - Stats: Pink (`bg-pink-500/20`, `text-pink-400`)
  - Continue: Green (`bg-green-500/20`, `text-green-400`)
  - On This Day: Amber (`bg-amber-500/20`, `text-amber-400`)

---

## Implementation Order

1. **Phase 1: Layout & Static UI**
   - Set up grid structure
   - Create all component shells with mock data
   - Get layout working responsively

2. **Phase 2: Data Integration**
   - Wire up existing data (events, todos, collections, recent)
   - Create `useHomeData` hook

3. **Phase 3: Inbox Feature**
   - Add inbox query logic
   - Create "Process" flow (could be navigate to filtered library view)
   - Track "processed" state

4. **Phase 4: Sidebar Widgets**
   - Stats calculation
   - Continue reading (requires `lastOpenedAt` tracking)
   - On This Day query

5. **Phase 5: Polish**
   - Empty states
   - Loading skeletons
   - Animations/transitions
   - localStorage for dismissed Rediscover

---

## Reference Implementation

See the React mockup file for complete working code:
`/mnt/user-data/outputs/pawkit-home-inbox.jsx`

This can be used as a direct reference for styling and structure.

---

## Questions to Resolve

1. **Inbox "Process" action:** Should it navigate to `/library?filter=inbox` or open a triage modal?

2. **Reading progress:** Do we want to track scroll position for articles? Or just use `lastOpenedAt` for now?

3. **Streak calculation:** How do we define a "day with activity"? Any save? Or must include organizing?

4. **Right sidebar responsiveness:** Hide on mobile? Move to bottom?

---

## Success Criteria

- [ ] Home loads data from IndexedDB (local-first)
- [ ] All widgets display correctly with real data
- [ ] Inbox shows correct count of unorganized items
- [ ] Pinned Pawkits show thumbnail previews
- [ ] Week calendar highlights today
- [ ] Stats calculate correctly
- [ ] On This Day shows item from 1 year ago (if exists)
- [ ] Responsive on tablet/desktop
- [ ] Matches visual design from mockups
