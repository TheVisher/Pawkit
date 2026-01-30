import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  // Spread auth tables but override users with custom fields
  ...authTables,
  // =============================================
  // USERS (Extended from authTables)
  // =============================================
  users: defineTable({
    // Fields from @convex-dev/auth (keep these for compatibility)
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),

    // Custom Pawkit fields
    displayName: v.optional(v.string()),

    // Extension token (V1 parity) - secure hash-based storage
    // Token is never stored - user sees it once on generation
    // Validation: lookup by prefix → compare hash in code
    extensionTokenHash: v.optional(v.string()), // SHA-256 hash for validation
    extensionTokenPrefix: v.optional(v.string()), // First 8 chars for indexed lookup
    extensionTokenCreatedAt: v.optional(v.number()),

    // Sync toggle
    serverSync: v.optional(v.boolean()),

    // Timestamps
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("email", ["email"]) // Required by @convex-dev/auth
    .index("phone", ["phone"]) // Required by @convex-dev/auth
    .index("by_extension_token_prefix", ["extensionTokenPrefix"]), // Token lookup by prefix

  // =============================================
  // WORKSPACES
  // =============================================
  workspaces: defineTable({
    name: v.string(),
    icon: v.optional(v.string()),
    userId: v.id("users"),
    isDefault: v.boolean(),
    preferences: v.optional(
      v.object({
        recentTags: v.optional(v.array(v.string())),
        tagColors: v.optional(v.any()), // Record<string, string>
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_default", ["userId", "isDefault"]),

  // =============================================
  // CARDS (Core content unit)
  // =============================================
  cards: defineTable({
    workspaceId: v.id("workspaces"),

    // Content
    type: v.string(), // url, md-note, text-note, quick-note, file
    url: v.optional(v.string()), // Optional: notes don't have URLs
    title: v.optional(v.string()),
    description: v.optional(v.string()),

    // Plate editor content as native JSON object
    content: v.optional(v.any()), // Plate JSON document structure
    // Plain text extraction for full-text search
    contentText: v.optional(v.string()), // Extracted text from content for search

    notes: v.optional(v.string()), // User annotations

    // Metadata
    domain: v.optional(v.string()),
    image: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    favicon: v.optional(v.string()),
    metadata: v.optional(v.any()), // Flexible JSON
    status: v.string(), // PENDING, READY, ERROR
    transcriptSegments: v.optional(v.string()),

    // AI fields
    structuredData: v.optional(v.any()),
    source: v.optional(v.any()),

    // Organization (tag-based)
    tags: v.array(v.string()),
    pinned: v.boolean(),

    // Scheduling
    scheduledDates: v.array(v.string()),
    scheduledStartTime: v.optional(v.string()),
    scheduledEndTime: v.optional(v.string()),

    // Article/Reader
    articleContent: v.optional(v.string()),
    articleContentEdited: v.optional(v.boolean()),
    summary: v.optional(v.string()),
    summaryType: v.optional(v.string()),

    // File support (using Convex storage)
    isFileCard: v.boolean(),
    storageId: v.optional(v.id("_storage")), // Convex-native file reference

    // Cloud sync (for BYOS)
    cloudId: v.optional(v.string()),
    cloudProvider: v.optional(v.string()),
    cloudSyncedAt: v.optional(v.number()),

    // Smart Detection
    convertedToTodo: v.optional(v.boolean()),
    dismissedTodoSuggestion: v.optional(v.boolean()),

    // Reading Tracking
    wordCount: v.optional(v.number()),
    readingTime: v.optional(v.number()),
    readProgress: v.optional(v.number()),
    isRead: v.optional(v.boolean()),
    lastScrollPosition: v.optional(v.number()),
    manuallyMarkedUnread: v.optional(v.boolean()),

    // Link Health
    linkStatus: v.optional(v.string()),
    lastLinkCheck: v.optional(v.number()),
    redirectUrl: v.optional(v.string()),

    // Daily Note
    isDailyNote: v.optional(v.boolean()),

    // Export tracking
    exportedNoteId: v.optional(v.string()),
    exportedHighlightCount: v.optional(v.number()),

    // Contact header
    headerGradientColor: v.optional(v.string()),
    headerImagePosition: v.optional(v.number()),

    // Image optimization
    dominantColor: v.optional(v.string()),
    aspectRatio: v.optional(v.number()),
    blurDataUri: v.optional(v.string()),

    // Soft delete
    deleted: v.boolean(),
    deletedAt: v.optional(v.number()),

    // Timestamps (for sorting, sync)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_deleted", ["workspaceId", "deleted"])
    .index("by_workspace_type", ["workspaceId", "type"])
    .index("by_workspace_status", ["workspaceId", "status"])
    .index("by_workspace_pinned", ["workspaceId", "pinned"])
    .index("by_workspace_daily", ["workspaceId", "isDailyNote"])
    .index("by_workspace_read", ["workspaceId", "isRead"])
    .index("by_workspace_link_status", ["workspaceId", "linkStatus"])
    // Full-text search indexes (one per field - Convex requirement)
    .searchIndex("search_by_title", {
      searchField: "title",
      filterFields: ["workspaceId", "deleted"],
    })
    .searchIndex("search_by_description", {
      searchField: "description",
      filterFields: ["workspaceId", "deleted"],
    })
    .searchIndex("search_by_content", {
      searchField: "contentText", // Plain text extracted from Plate JSON
      filterFields: ["workspaceId", "deleted"],
    }),

  // =============================================
  // COLLECTIONS (Pawkits)
  // =============================================
  collections: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    slug: v.string(),
    parentId: v.optional(v.id("collections")),
    position: v.number(),

    // Display
    coverImage: v.optional(v.string()),
    coverImagePosition: v.optional(v.number()),
    coverImageHeight: v.optional(v.number()),
    coverContentOffset: v.optional(v.number()),
    icon: v.optional(v.string()),

    // Flags
    isPrivate: v.boolean(),
    isLocalOnly: v.optional(v.boolean()),
    isSystem: v.boolean(),
    hidePreview: v.boolean(),
    useCoverAsBackground: v.boolean(),
    pinned: v.boolean(),

    // Board config
    boardMetadata: v.optional(v.any()),

    // Soft delete
    deleted: v.boolean(),
    deletedAt: v.optional(v.number()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_slug", ["workspaceId", "slug"])
    .index("by_workspace_deleted", ["workspaceId", "deleted"])
    .index("by_workspace_parent", ["workspaceId", "parentId"]),

  // =============================================
  // COLLECTION NOTES (Junction)
  // =============================================
  collectionNotes: defineTable({
    collectionId: v.id("collections"),
    cardId: v.id("cards"),
    position: v.number(),
    createdAt: v.number(),
  })
    .index("by_collection", ["collectionId"])
    .index("by_card", ["cardId"])
    .index("by_collection_card", ["collectionId", "cardId"]),

  // =============================================
  // CALENDAR EVENTS
  // =============================================
  calendarEvents: defineTable({
    workspaceId: v.id("workspaces"),
    title: v.string(),
    date: v.string(),
    endDate: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    isAllDay: v.boolean(),

    description: v.optional(v.string()),
    location: v.optional(v.string()),
    url: v.optional(v.string()),
    color: v.optional(v.string()),

    // Recurrence
    recurrence: v.optional(v.any()),
    recurrenceParentId: v.optional(v.id("calendarEvents")),
    excludedDates: v.array(v.string()),
    isException: v.boolean(),

    source: v.optional(v.any()),

    deleted: v.boolean(),
    deletedAt: v.optional(v.number()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_date", ["workspaceId", "date"])
    .index("by_workspace_deleted", ["workspaceId", "deleted"])
    .index("by_recurrence_parent", ["recurrenceParentId"]),

  // =============================================
  // TODOS
  // =============================================
  todos: defineTable({
    workspaceId: v.id("workspaces"),
    text: v.string(),
    completed: v.boolean(),
    completedAt: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    priority: v.optional(v.string()),
    linkedCardId: v.optional(v.id("cards")),

    deleted: v.boolean(),
    deletedAt: v.optional(v.number()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_completed", ["workspaceId", "completed"])
    .index("by_workspace_due", ["workspaceId", "dueDate"])
    .index("by_workspace_deleted", ["workspaceId", "deleted"]),

  // =============================================
  // VIEW SETTINGS
  // =============================================
  viewSettings: defineTable({
    workspaceId: v.id("workspaces"),
    viewKey: v.string(),
    layout: v.string(),
    sortBy: v.string(),
    sortOrder: v.string(),
    showTitles: v.boolean(),
    showUrls: v.boolean(),
    showTags: v.boolean(),
    cardPadding: v.number(),
    cardSpacing: v.optional(v.number()),
    cardSize: v.optional(v.string()),
    showMetadataFooter: v.optional(v.boolean()),
    listColumnOrder: v.optional(v.array(v.string())),
    listColumnWidths: v.optional(v.any()),
    listColumnVisibility: v.optional(v.any()),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_view", ["workspaceId", "viewKey"]),

  // =============================================
  // REFERENCES (@ mentions)
  // =============================================
  references: defineTable({
    workspaceId: v.id("workspaces"),
    sourceId: v.string(),
    targetId: v.string(),
    targetType: v.string(), // 'card' | 'pawkit' | 'date'
    linkText: v.string(),

    deleted: v.boolean(),
    deletedAt: v.optional(v.number()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_source", ["sourceId"])
    .index("by_target", ["targetId", "targetType"])
    .index("by_workspace_source", ["workspaceId", "sourceId"])
    .index("by_workspace_deleted", ["workspaceId", "deleted"]),

  // =============================================
  // CONNECTED ACCOUNTS (Reddit, YouTube, etc.)
  // SECURITY: Tokens are encrypted before storage
  // =============================================
  connectedAccounts: defineTable({
    userId: v.id("users"),
    platform: v.string(),
    platformUserId: v.optional(v.string()),
    platformUsername: v.optional(v.string()),

    // ENCRYPTED: Use crypto.subtle.encrypt() before storing
    // Decryption only happens in internal actions, never exposed in queries
    encryptedAccessToken: v.optional(v.string()),
    encryptedRefreshToken: v.optional(v.string()),
    tokenExpiry: v.optional(v.number()),

    // Sync state
    lastSync: v.optional(v.number()),
    syncCursor: v.optional(v.string()),
    syncStatus: v.string(),
    lastError: v.optional(v.string()),

    config: v.optional(v.any()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_platform", ["userId", "platform"]),

  // =============================================
  // CONNECTIONS (Cloud storage - BYOS)
  // SECURITY: API tokens are encrypted before storage
  // =============================================
  connections: defineTable({
    userId: v.id("users"),
    provider: v.string(), // filen, google-drive, dropbox, onedrive
    status: v.string(),
    config: v.optional(v.any()),
    encryptedApiToken: v.optional(v.string()), // Encrypted, never returned in queries
    lastSyncAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_provider", ["userId", "provider"]),

  // =============================================
  // IMPORT JOBS
  // =============================================
  importJobs: defineTable({
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
    platform: v.string(),
    jobType: v.string(),
    status: v.string(),
    totalItems: v.optional(v.number()),
    processedItems: v.number(),
    skippedItems: v.number(),
    errorCount: v.number(),
    errors: v.optional(v.any()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_workspace", ["workspaceId"]),

  // =============================================
  // CITATIONS (Topic Notes)
  // =============================================
  citations: defineTable({
    noteId: v.id("cards"),
    sourceType: v.string(),
    sourceId: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    quote: v.optional(v.string()),
    timestamp: v.optional(v.string()),
    author: v.optional(v.string()),
    platformMeta: v.optional(v.any()),
    position: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_note", ["noteId"])
    .index("by_source", ["sourceType", "sourceId"]),

  // =============================================
  // RATE LIMITS (IP-based rate limiting for public APIs)
  // =============================================
  rateLimits: defineTable({
    key: v.string(), // Format: "ip:endpoint" e.g. "192.168.1.1:/api/metadata"
    count: v.number(), // Number of requests in current window
    windowStart: v.number(), // Start of current window (timestamp)
    expiresAt: v.number(), // When this record can be cleaned up
  })
    .index("by_key", ["key"])
    .index("by_expires", ["expiresAt"]),
});
