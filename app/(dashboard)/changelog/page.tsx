"use client";

export default function ChangelogPage() {
  const changes = [
    {
      dateRange: "October 21, 2025",
      features: [
        { title: "Unified Frosted Glass Design System", description: "Complete visual redesign with cohesive frosted glass and glow aesthetic throughout the entire app. All modals, buttons, and UI elements now feature a consistent glass-morphism style with purple, green, and red glow effects on hover." },
        { title: "Vertical Icon Navigation", description: "Redesigned Card Detail Modal with vertical icon-based tab navigation on the right side, replacing horizontal tabs for a cleaner, more intuitive interface with better space utilization." },
        { title: "GlowButton Component", description: "New unified button component with three variants (primary, success, danger) featuring pill-shaped design and glow effects. All buttons across the app now use this consistent styling with smooth hover animations." },
        { title: "Modal Portal Rendering", description: "Fixed modal positioning issues across all views by rendering modals via React portals directly to document.body, eliminating z-index and stacking context problems that caused modals to appear shifted or blocked." },
        { title: "Profile Settings Redesign", description: "Updated Profile Settings modal with frosted glass styling, consistent tab heights to prevent layout shifts, and GlowButton components throughout for a polished user experience." },
        { title: "Command Palette Glass Styling", description: "Applied frosted glass aesthetic to the Command Palette for visual consistency with the rest of the app." },
        { title: "Browser Compatibility Fix", description: "Added script-src-elem CSP directive to fix white screen issues in Atlas browser (ChatGPT's Chromium-based browser) and other strict browsers that enforce granular Content Security Policy directives." },
        { title: "Design Token System", description: "Created centralized design tokens file with standardized colors, shadows, and border radii for consistent theming across the application." },
        { title: "Tailwind Theme Extensions", description: "Extended Tailwind configuration with custom glass colors (glass-surface, glass-border) and glow shadow effects (glow-accent, glow-success, glow-danger) for streamlined development." },
      ],
    },
    {
      dateRange: "October 18-19, 2025",
      features: [
        { title: "Daily Notes System", description: "Automatic daily note creation and management with YYYY-MM-DD format titles. Daily notes appear as colored pills at the bottom of calendar cells, with timezone-safe date handling to prevent display issues across different regions." },
        { title: "Enhanced Note Previews", description: "Improved markdown preview in note modals with better formatting, consistent styling, and proper content rendering. Notes view now includes rich previews with metadata display and improved card gallery integration." },
        { title: "Image Context Menu", description: "Right-click on any image in your browser to save it directly to Pawkit with automatic page context - includes the page title, URL, and timestamp for better organization and searchability." },
        { title: "Calendar UI Enhancements", description: "Redesigned calendar view with improved daily note pills, better event positioning, and enhanced visual consistency. Custom styling ensures daily notes are prominently displayed without interfering with other calendar events." },
        { title: "Public Privacy Policy", description: "Added publicly accessible privacy policy pages at /privacy and /privacy.html for compliance with browser extension store requirements, with proper routing that bypasses authentication middleware." },
        { title: "Extension Security Improvements", description: "Relaxed extension ID requirements to support multiple browser extensions, and fixed CORS redirect issues by using www.getpawkit.com consistently across all API requests." },
        { title: "Authentication Flow Fixes", description: "Improved login/signup redirect behavior with forced page reloads to ensure proper state initialization and prevent stale data issues after authentication." },
        { title: "Knowledge Graph Visualization", description: "Interactive graph view of note connections showing how your notes link together, with visual representation of backlinks and outgoing links for better knowledge discovery." },
        { title: "Note Templates System", description: "Pre-built templates for common note types including daily notes, meeting notes, project plans, and more - accessible from the note creation interface for faster note-taking." },
        { title: "Smart Note Search", description: "Intelligent search that finds notes by title, content, and tags with fuzzy matching and instant results as you type." },
        { title: "Conflict Resolution UI", description: "Visual conflict detection and resolution when the same card is edited on multiple devices, allowing you to choose which version to keep or merge changes manually." },
        { title: "Enhanced Markdown Editor", description: "Custom markdown editor with preview mode by default, consolidated controls, and improved editing experience - replaced heavy third-party editor with lightweight custom implementation." },
      ],
    },
    {
      dateRange: "October 17, 2025",
      features: [
        { title: "Wiki-Style Note Linking", description: "Connect your notes using [[Note Title]] syntax with automatic backlink tracking. Click links in preview mode to navigate between notes, view incoming and outgoing links in the new Links tab, and build your personal knowledge graph - all stored locally in IndexedDB for instant, offline access." },
        { title: "Bidirectional Link Visualization", description: "New Links tab in note modals displays both backlinks (notes linking TO this note) and outgoing links (notes this note links TO) with real-time updates and one-click navigation between connected notes." },
        { title: "Smart Link Resolution", description: "Fuzzy title matching automatically finds notes as you type wiki-links, with broken links clearly marked when target notes don't exist. Links update automatically when you rename notes or edit content." },
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
