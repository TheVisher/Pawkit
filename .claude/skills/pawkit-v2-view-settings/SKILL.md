# Pawkit V2 View Settings

**Purpose**: Sync vs local preferences, per-view and per-content-type settings

**Created**: December 20, 2025

---

## SETTINGS SPLIT: SYNCED VS LOCAL

### Synced Settings (Cross-Device)
Stored in database, synced across all devices:

| Setting | Stored In | Description |
|---------|-----------|-------------|
| `layout` | UserViewSettings | grid, masonry, list, timeline, board |
| `sortBy` | UserViewSettings | createdAt, updatedAt, title, domain |
| `sortOrder` | UserViewSettings | asc, desc |
| `showTitles` | UserViewSettings | Boolean |
| `showUrls` | UserViewSettings | Boolean |
| `showTags` | UserViewSettings | Boolean |
| `cardPadding` | UserViewSettings | 0-4 scale |

### Local Settings (Device-Specific)
Stored in localStorage, NOT synced:

| Setting | Stored In | Reason |
|---------|-----------|--------|
| `cardSize` | localStorage | Depends on screen size |
| `leftSidebarCollapsed` | localStorage | Depends on screen width |
| `rightSidebarCollapsed` | localStorage | Depends on screen width |
| `leftSidebarAnchored` | localStorage | Personal preference per device |
| `rightSidebarAnchored` | localStorage | Personal preference per device |
| `styleMode` | localStorage | glass vs modern (visual preference) |

---

## DATABASE SCHEMA

```prisma
model UserViewSettings {
  id          String    @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  // View identifier
  // Examples: "library", "library:notes", "library:bookmarks", "pawkit:restaurants"
  viewKey     String

  // Synced settings
  layout      String   @default("grid")
  sortBy      String   @default("createdAt")
  sortOrder   String   @default("desc")
  showTitles  Boolean  @default(true)
  showUrls    Boolean  @default(true)
  showTags    Boolean  @default(true)
  cardPadding Int      @default(2)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([workspaceId, viewKey])
  @@index([workspaceId])
}
```

---

## VIEW KEY PATTERNS

```typescript
// View key formats:
"library"              // All library content
"library:notes"        // Library filtered to notes
"library:bookmarks"    // Library filtered to bookmarks
"library:video"        // Library filtered to video
"pawkit:restaurants"   // Specific Pawkit by slug
"calendar"             // Calendar view
"home"                 // Home dashboard (fixed layout)
```

### Per-Content-Type Memory

When user filters by Content Type (e.g., Notes), their view preferences are saved separately:

```typescript
// User in Library, viewing all content
viewKey = "library"
settings = { layout: "grid", sortBy: "createdAt" }

// User filters to Notes only
viewKey = "library:notes"
settings = { layout: "list", sortBy: "title" }  // Different!

// User switches to Bookmarks
viewKey = "library:bookmarks"
settings = { layout: "masonry", sortBy: "domain" }  // Also different!
```

---

## LOCAL STORAGE SCHEMA

```typescript
// Key: "pawkit_device_preferences"
interface DevicePreferences {
  cardSize: number;              // 1-5 scale (slider value)
  leftSidebarCollapsed: boolean;
  rightSidebarCollapsed: boolean;
  leftSidebarAnchored: boolean;
  rightSidebarAnchored: boolean;
  styleMode: 'glass' | 'modern';
}

// Default values
const DEFAULT_DEVICE_PREFERENCES: DevicePreferences = {
  cardSize: 3,
  leftSidebarCollapsed: false,
  rightSidebarCollapsed: false,
  leftSidebarAnchored: true,
  rightSidebarAnchored: false,
  styleMode: 'glass'
};
```

---

## VIEW SETTINGS STORE

```typescript
// lib/stores/view-settings-store.ts
import { create } from 'zustand';
import { db } from '@/lib/db/dexie';

interface ViewSettings {
  layout: 'grid' | 'masonry' | 'list' | 'timeline' | 'board';
  sortBy: 'createdAt' | 'updatedAt' | 'title' | 'domain';
  sortOrder: 'asc' | 'desc';
  showTitles: boolean;
  showUrls: boolean;
  showTags: boolean;
  cardPadding: number;
}

interface ViewSettingsStore {
  settings: Record<string, ViewSettings>;  // Keyed by viewKey
  loading: boolean;

  loadSettings: (workspaceId: string) => Promise<void>;
  getSettings: (viewKey: string) => ViewSettings;
  updateSettings: (viewKey: string, updates: Partial<ViewSettings>) => Promise<void>;
}

const DEFAULT_SETTINGS: ViewSettings = {
  layout: 'grid',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  showTitles: true,
  showUrls: true,
  showTags: true,
  cardPadding: 2
};

export const useViewSettingsStore = create<ViewSettingsStore>((set, get) => ({
  settings: {},
  loading: false,

  loadSettings: async (workspaceId) => {
    set({ loading: true });
    const records = await db.viewSettings
      .where('workspaceId')
      .equals(workspaceId)
      .toArray();

    const settings: Record<string, ViewSettings> = {};
    for (const record of records) {
      settings[record.viewKey] = {
        layout: record.layout,
        sortBy: record.sortBy,
        sortOrder: record.sortOrder,
        showTitles: record.showTitles,
        showUrls: record.showUrls,
        showTags: record.showTags,
        cardPadding: record.cardPadding
      };
    }

    set({ settings, loading: false });
  },

  getSettings: (viewKey) => {
    return get().settings[viewKey] || DEFAULT_SETTINGS;
  },

  updateSettings: async (viewKey, updates) => {
    const current = get().getSettings(viewKey);
    const updated = { ...current, ...updates };

    // Update store
    set(state => ({
      settings: {
        ...state.settings,
        [viewKey]: updated
      }
    }));

    // Persist to Dexie
    await db.viewSettings.put({
      viewKey,
      workspaceId: getCurrentWorkspaceId(),
      ...updated,
      updatedAt: new Date()
    });

    // Queue sync
    syncService.queueSync({
      entityType: 'viewSettings',
      entityId: viewKey,
      operation: 'update',
      payload: updated
    });
  }
}));
```

---

## DEVICE PREFERENCES STORE

```typescript
// lib/stores/device-preferences-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DevicePreferencesStore {
  cardSize: number;
  leftSidebarCollapsed: boolean;
  rightSidebarCollapsed: boolean;
  leftSidebarAnchored: boolean;
  rightSidebarAnchored: boolean;
  styleMode: 'glass' | 'modern';

  setCardSize: (size: number) => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftAnchored: (anchored: boolean) => void;
  setRightAnchored: (anchored: boolean) => void;
  setStyleMode: (mode: 'glass' | 'modern') => void;
}

export const useDevicePreferencesStore = create<DevicePreferencesStore>()(
  persist(
    (set) => ({
      cardSize: 3,
      leftSidebarCollapsed: false,
      rightSidebarCollapsed: false,
      leftSidebarAnchored: true,
      rightSidebarAnchored: false,
      styleMode: 'glass',

      setCardSize: (size) => set({ cardSize: size }),
      toggleLeftSidebar: () => set((s) => ({ leftSidebarCollapsed: !s.leftSidebarCollapsed })),
      toggleRightSidebar: () => set((s) => ({ rightSidebarCollapsed: !s.rightSidebarCollapsed })),
      setLeftAnchored: (anchored) => set({ leftSidebarAnchored: anchored }),
      setRightAnchored: (anchored) => set({ rightSidebarAnchored: anchored }),
      setStyleMode: (mode) => set({ styleMode: mode })
    }),
    {
      name: 'pawkit_device_preferences'
    }
  )
);
```

---

## USAGE IN COMPONENTS

### Getting View Settings
```typescript
function LibraryView() {
  const contentType = useFilterStore(state => state.contentType);
  const viewKey = contentType ? `library:${contentType}` : 'library';

  const settings = useViewSettingsStore(state => state.getSettings(viewKey));
  const updateSettings = useViewSettingsStore(state => state.updateSettings);

  const handleLayoutChange = (layout: ViewSettings['layout']) => {
    updateSettings(viewKey, { layout });
  };

  return (
    <>
      {settings.layout === 'grid' && <GridView />}
      {settings.layout === 'masonry' && <MasonryView />}
      {settings.layout === 'list' && <ListView />}
    </>
  );
}
```

### Getting Device Preferences
```typescript
function DashboardLayout() {
  const { leftSidebarCollapsed, leftSidebarAnchored } = useDevicePreferencesStore();

  return (
    <div
      className={cn(
        'flex',
        leftSidebarAnchored && 'no-gap-left'
      )}
    >
      {!leftSidebarCollapsed && <LeftSidebar />}
      <CenterPanel />
      <RightSidebar />
    </div>
  );
}
```

---

## SYNCING VIEW SETTINGS

```typescript
// When syncing to server
async function syncViewSettings(workspaceId: string) {
  const settings = await db.viewSettings
    .where('workspaceId')
    .equals(workspaceId)
    .toArray();

  await fetch('/api/view-settings/sync', {
    method: 'POST',
    body: JSON.stringify({ settings })
  });
}

// When receiving from server
async function applyServerSettings(serverSettings: ViewSettingsRecord[]) {
  await db.transaction('rw', db.viewSettings, async () => {
    for (const setting of serverSettings) {
      const local = await db.viewSettings
        .where('[workspaceId+viewKey]')
        .equals([setting.workspaceId, setting.viewKey])
        .first();

      // Only apply if server is newer
      if (!local || new Date(setting.updatedAt) > new Date(local.updatedAt)) {
        await db.viewSettings.put(setting);
      }
    }
  });
}
```

---

## WHY THIS SPLIT?

### Synced (Cross-Device)
- **Layout**: User expects same view type everywhere
- **Sort**: User's preferred organization
- **Visibility toggles**: Consistent information density

### Local (Device-Specific)
- **Card size**: Depends on screen DPI and resolution
- **Sidebar state**: Depends on available screen width
- **Style mode**: Personal visual preference per device

---

**Last Updated**: December 20, 2025
