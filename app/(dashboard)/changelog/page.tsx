"use client";

export default function ChangelogPage() {
  const changes = [
    {
      dateRange: "October 17, 2025",
      features: [
        { title: "Local-First Architecture Enforcement", description: "Fixed critical violations where Den Pawkits, Timeline, and Dig Up operations were bypassing IndexedDB and writing directly to server. All operations now update local database first, then sync to server in background for fast, responsive updates without duplicates." },
        { title: "Den Pawkit Data Integrity", description: "Create, rename, and delete operations for Den Pawkits now properly use the data store with intelligent routing to the correct API endpoint, ensuring data consistency across devices." },
        { title: "Timeline Bulk Operations Fix", description: "Bulk move and delete operations in Timeline view now follow local-first pattern, updating IndexedDB immediately while server sync happens in background." },
        { title: "Dig Up Improvements", description: "Delete and add-to-collection operations now use data store for instant updates and proper sync, eliminating delays and potential data loss." },
        { title: "Sidebar Crash Fix", description: "Fixed critical null reference error that caused sidebar to crash after PostgreSQL migration when collections were missing children property - added proper null safety checks." },
        { title: "Type Safety Enhancements", description: "Added inDen property to CollectionNode type and extended data store type signatures for full Den Pawkit support with TypeScript validation." },
      ],
    },
    {
      dateRange: "October 16, 2025",
      features: [
        { title: "YouTube Video Embedding Fixed", description: "Fixed YouTube videos not playing in card modals - videos now embed correctly with proper CSP configuration and responsive 16:9 aspect ratio" },
        { title: "Notes Modal Scrolling Fixed", description: "Notes are now immediately scrollable without requiring preview/edit mode selection - consistent modal sizing with proper overflow behavior" },
      ],
    },
    {
      dateRange: "October 15, 2025",
      features: [
        { title: "Unified Top Bar Controls", description: "Consolidated all view controls into a consistent top bar with View Options, Sort/Filter, and Actions menus" },
        { title: "Persistent View Settings", description: "View-specific settings now sync across sessions with database storage and local-only mode support" },
        { title: "Standardized Page Headers", description: "All pages now have consistent headers with matching icons and formatting" },
        { title: "Enhanced Card Fallbacks", description: "Improved display for cards without thumbnails with better fallback UI and domain information" },
        { title: "3D Printing Site Support", description: "Added MakerWorld, Thingiverse, and Printables to e-commerce metadata for better thumbnails" },
        { title: "Masonry Layout Fix", description: "Fixed masonry layout breaking on page refresh with automatic image load tracking and reflow" },
        { title: "Quick Access Improvements", description: "Home screen Pawkits now show card preview thumbnails instead of generic folder icons" },
        { title: "Pawkit Management Integration", description: "Moved all Pawkit creation and management actions into the unified top bar menu" },
        { title: "Automatic Layout Recovery", description: "Added ResizeObserver for automatic masonry layout recalculation when content changes" },
      ],
    },
    {
      dateRange: "October 14, 2025",
      features: [
        { title: "Local-Only Mode", description: "Complete server-side enforcement of local-only mode with middleware-based protection for all write operations" },
        { title: "Auto-Sync Control", description: "Optional auto-sync toggle to control whether pending changes sync when server sync is re-enabled" },
        { title: "Settings Migration", description: "Automatic migration of localStorage settings to database for server-side enforcement" },
        { title: "Den Card URL Fix", description: "Made URLs in Den cards directly clickable like Library cards without opening the modal" },
        { title: "Per-Area Display Settings", description: "Independent display customization for Library, Home, Den, and Pawkits with show/hide controls for titles, URLs, and tags" },
        { title: "Card Padding Control", description: "Adjustable card padding with 5 levels (None, XS, SM, MD, LG) for each area" },
        { title: "Image Storage System", description: "Automatic Supabase image storage for expiring URLs to prevent broken thumbnails" },
      ],
    },
    {
      dateRange: "October 10, 2025",
      features: [
        { title: "Dynamic Card Size Slider", description: "Adjustable card size control with 5 levels on desktop (XS to XL) and 3 levels on mobile (Small to Large)" },
        { title: "Mobile Optimizations", description: "Card modal with toggleable details sheet, improved profile modal with 2-column tabs, responsive calendar grid" },
        { title: "Chrome Extension Support", description: "Chrome Web Store submission with Manifest V3 compatibility and service worker background" },
      ],
    },
    {
      dateRange: "October 9, 2025",
      features: [
        { title: "Firefox Extension Published", description: "Pawkit Web Clipper v1.0.0 now available on Firefox Add-ons store" },
        { title: "Extension Icon Update", description: "Updated extension to use new Pawkit logo (blue paw)" },
        { title: "Security Enhancements", description: "Comprehensive security fixes including XSS prevention, SSRF protection, and CSP headers" },
        { title: "Token Security", description: "Extension tokens now use bcrypt hashing with 30-day expiry" },
        { title: "Validation Fixes", description: "Fixed null handling in card updates for better reliability" },
      ],
    },
    {
      dateRange: "October 8, 2025",
      features: [
        { title: "Demo Mode", description: "Full demo experience with sample data for new users" },
        { title: "7-Day Calendar Widget", description: "Week view calendar on home page starting Monday" },
        { title: "Card UI Improvements", description: "Glass URL pills on card thumbnails with direct clickable links" },
        { title: "Editable Titles", description: "Edit card titles directly from the modal with multi-line support" },
        { title: "Modal Redesign", description: "Centered content with right slide-out details panel" },
      ],
    },
    {
      dateRange: "October 7, 2025",
      features: [
        { title: "Calendar View", description: "Full calendar for scheduling and organizing cards by date" },
        { title: "Manual Date Assignment", description: "Schedule cards to specific dates from the modal" },
        { title: "New Paw Logo", description: "Updated branding with new paw icon design" },
        { title: "Den Security Isolation", description: "Ensured Den cards are completely isolated from other views" },
      ],
    },
    {
      dateRange: "October 6, 2025",
      features: [
        { title: "Universal Context Menu", description: "Right-click menu for quick card and Pawkit actions" },
        { title: "Landing Page", description: "Professional landing page for new visitors" },
        { title: "Performance Optimization", description: "Local-first architecture for instant UI updates" },
      ],
    },
    {
      dateRange: "October 5, 2025",
      features: [
        { title: "Browser Extension", description: "Chrome/Firefox extension with one-click bookmarking" },
        { title: "Real-time Sync", description: "Instant sync between extension and web app" },
        { title: "YouTube Player", description: "Embedded YouTube videos in card modals" },
        { title: "Reddit Image Support", description: "Proper image extraction from Reddit posts" },
        { title: "The Den (Phase 1)", description: "Private secure area for sensitive bookmarks" },
        { title: "Dig Up Improvements", description: "Better card discovery with pagination and filters" },
        { title: "Conflict Detection", description: "Prevents data overwrites from multiple devices" },
        { title: "Network Retry System", description: "Automatic retries for failed operations" },
        { title: "Timeline View", description: "Consolidated library and timeline views" },
      ],
    },
    {
      dateRange: "October 4, 2025",
      features: [
        { title: "Smart Metadata", description: "Site-specific handlers for better thumbnails (Amazon, TikTok, Nike, etc.)" },
        { title: "Screenshot Fallbacks", description: "Automatic screenshots for JavaScript-rendered pages" },
        { title: "Personalized Greetings", description: "Display names and custom welcome messages" },
        { title: "Manual Metadata Refresh", description: "Refresh card metadata on demand" },
        { title: "Duplicate Prevention", description: "Fixed card duplication and persistence issues" },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-foreground mb-3">Changelog</h1>
        <p className="text-muted-foreground">Track all the new features and improvements we&apos;ve shipped</p>
      </div>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent/20" />

        {changes.map((period, idx) => (
          <div key={idx} className="relative pl-8 pb-12 last:pb-0">
            {/* Date dot */}
            <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-accent ring-4 ring-background -translate-x-[5px]" />

            {/* Date range */}
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-accent">{period.dateRange}</h2>
            </div>

            {/* Features */}
            <div className="space-y-3">
              {period.features.map((feature, featureIdx) => (
                <div
                  key={featureIdx}
                  className="rounded-xl border border-subtle bg-surface p-4 hover:border-accent/50 transition-colors"
                >
                  <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
