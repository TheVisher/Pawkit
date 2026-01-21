---
component: "calendar"
complexity: "high"
status: "in-progress"
last_updated: "2025-12-22"
maintainer: "Claude Code"
---

# Calendar

> Month/Week/Day/Agenda views for scheduling cards, events, and tasks

---

## Purpose

The Calendar component provides time-based visualization and management of:

- **CalendarEvents** - Standalone events with optional recurrence
- **Scheduled Cards** - Bookmarks/notes with `scheduledDate`
- **Todos** - Tasks with due dates (planned)
- **Daily Notes** - Auto-linked notes for specific dates (planned)

This is the primary interface for Pawkit's temporal organization features.

---

## Architecture

### Data Flow

```
CalendarStore (navigation, viewMode)
       ↓
   Calendar Page (loads data)
       ↓
   MonthView / WeekView / DayView / AgendaView
       ↓
   DayCell / EventItem
       ↓
   Click → Day detail or event modal (planned)
```

### Key Dependencies

| Dependency | Purpose |
|------------|---------|
| `useDataStore` | Access to cards, events, todos |
| `useCalendarStore` | Current date, view mode (month/week/day/agenda) |
| `date-fns` | Date calculations and formatting |

### State Management

- **Local state**: None currently (all in stores)
- **Store connections**:
  - `useDataStore` for cards/events
  - `useCalendarStore` for navigation and view mode
- **Props**: View mode determines which view renders

---

## File Structure

```
src/components/calendar/
├── calendar-header.tsx    # Navigation, view dropdown
├── month-view.tsx         # 6-week grid layout
├── week-view.tsx          # 7-day time grid
├── day-view.tsx           # Single day time grid
├── agenda-view.tsx        # Upcoming events list
├── day-cell.tsx           # Individual day container (month view)
├── event-item.tsx         # Rendered event/card item
└── index.ts               # Exports
```

### File Responsibilities

| File | Lines | Purpose |
|------|-------|---------|
| `calendar-header.tsx` | ~93 | Month/year navigation, view dropdown (Month/Week/Day/Agenda) |
| `month-view.tsx` | ~130 | 6-week grid, combines events + scheduled cards |
| `week-view.tsx` | ~163 | 7-day time grid with hourly slots |
| `day-view.tsx` | ~135 | Single day time grid with hourly slots |
| `agenda-view.tsx` | ~160 | List of upcoming events (next 30 days) |
| `day-cell.tsx` | ~75 | Day container with event list, "more" indicator |
| `event-item.tsx` | ~95 | Compact/full event rendering with type icons |
| `index.ts` | ~7 | Re-exports all components |

---

## Current Status

### What's Working

- [x] Calendar header with month/year display
- [x] Previous/next month navigation
- [x] View mode dropdown (Month/Week/Day/Agenda)
- [x] Month view with 6-week grid
- [x] Week view with 7-day time grid (24 hours)
- [x] Day view with single day time grid (24 hours)
- [x] Agenda view with upcoming events list (30 days)
- [x] Day cells showing events and scheduled cards
- [x] Event items with type-specific colors and icons
- [x] "Today" highlight across all views
- [x] Current month vs other month styling (month view)
- [x] Click day to switch to day view (month view)
- [x] Hourly time slots with event positioning (week/day views)

### What's Not Implemented

- [ ] Drag-to-reschedule
- [ ] Click-to-create event
- [ ] Todo due date display
- [ ] Recurrence handling
- [ ] Holiday display (with country picker)
- [ ] Week start preference (Sunday/Monday - currently Sunday)
- [ ] All-day event section (week/day views)
- [ ] Event detail modal
- [ ] Event creation modal
- [ ] Time zone support

### Recent Changes

| Date | Change | Commit/PR |
|------|--------|-----------|
| 2025-12-22 | Fixed padding consistency and gap-based cell separation | — |
| 2025-12-22 | Added WeekView, DayView, AgendaView | — |
| 2025-12-22 | Converted view toggle to dropdown menu | — |
| 2025-12-22 | Implemented MonthView with DayCell and EventItem | — |
| 2025-12-21 | Initial calendar-header.tsx skeleton | — |

---

## Known Issues

| Issue | Severity | Workaround |
|-------|----------|------------|
| No event creation UI | Medium | Events must be created via API/console |
| No all-day event section in week/day views | Low | All-day events currently hidden |
| Events only show in their start hour slot | Low | Multi-hour events not spanning |

---

## Usage Examples

### All Views

```tsx
import { CalendarHeader, MonthView, WeekView, DayView, AgendaView } from '@/components/calendar'

<CalendarHeader />
{viewMode === 'month' && <MonthView />}
{viewMode === 'week' && <WeekView />}
{viewMode === 'day' && <DayView />}
{viewMode === 'agenda' && <AgendaView />}
```

### Event Item (Compact Mode)

```tsx
<EventItem
  item={{
    id: '1',
    title: 'Team Meeting',
    date: '2025-12-22',
    type: 'event',
    color: 'hsl(var(--accent-primary))',
    startTime: '14:00',
  }}
  compact
/>
```

---

## View Implementations

### MonthView
- 6-week grid (42 days) with `auto-rows-fr` for equal height rows
- Floating card layout with `gap-2` (8px spacing between cells)
- **No background** - cells float independently
- Each cell has:
  - `bg-bg-surface-1` background with `rounded-lg`
  - Subtle border (`border-border-subtle/50`) for definition
  - Shadow for depth (`shadow-sm`, `hover:shadow-md`)
- Shows up to 3 events per day
- "More" indicator for additional events
- Selected day has purple ring on day number (not whole cell)
- Click day → switch to day view

### WeekView
- 7 columns (Sunday - Saturday)
- 24 hours with 60px per hour
- Events displayed in their start hour slot
- Hover highlighting on time slots

### DayView
- Single column for current day
- Same hourly structure as week view
- Larger event cards with more details
- Good for detailed day planning

### AgendaView
- List format grouped by date
- Shows next 30 days
- Only displays days with events
- "Today" and "Tomorrow" labels
- Events sorted by time within each day

---

## Data Model Reference

### CalendarItem (Internal)

```typescript
interface CalendarItem {
  id: string;
  title: string;
  date: string;           // YYYY-MM-DD
  color?: string;
  type: 'event' | 'card' | 'todo';
  isAllDay?: boolean;
  startTime?: string;     // HH:mm
  endTime?: string;       // HH:mm
  source?: {
    type: string;
    cardId?: string;
  };
}
```

### LocalCalendarEvent (from types.ts)

```typescript
interface LocalCalendarEvent extends SyncMetadata {
  id: string;
  workspaceId: string;
  title: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  isAllDay: boolean;
  description?: string;
  location?: string;
  url?: string;
  color?: string;
  recurrence?: RecurrenceRule;
  source?: { type: 'manual' | 'card' | 'kit', cardId?: string };
}
```

---

## Testing Notes

- Verify month navigation doesn't skip months
- Check that today is highlighted correctly across all views
- Verify scheduled cards appear on correct dates
- Test view switching (month → week → day → agenda)
- Verify "more" indicator shows when >3 events in a day (month view)
- Check hourly time labels format correctly (week/day views)
- Verify agenda view filters to next 30 days
- Test empty states (no events in agenda view)

---

## Related Documentation

- [PLAYBOOK.md - Section 5](../../docs/PLAYBOOK.md) - Calendar data model
- [PLAYBOOK.md - Section 13](../../docs/PLAYBOOK.md) - Phase 5 build order
- [pawkit-v2-data-model](../../.claude/skills/pawkit-v2-data-model/SKILL.md) - Entity schemas
- [BUILD_PROGRESS.md](../../docs/BUILD_PROGRESS.md) - Current phase status

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 0.3 | 2025-12-22 | Added WeekView, DayView, AgendaView; dropdown menu |
| 0.2 | 2025-12-22 | Added MonthView, DayCell, EventItem, index.ts |
| 0.1 | 2025-12-21 | Initial calendar-header.tsx skeleton |
