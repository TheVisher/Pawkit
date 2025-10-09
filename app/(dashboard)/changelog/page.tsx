"use client";

export default function ChangelogPage() {
  const changes = [
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
