import Link from "next/link";
import { HelpCircle, Command, Keyboard, FileText, Compass, Bookmark, Star, Zap } from "lucide-react";

const hotkeyGroups = [
  {
    title: "Global Navigation",
    items: [
      { keys: ["⌘", "K"], description: "Open Command Palette" },
      { keys: ["⌘", "N"], description: "Create new note" },
      { keys: ["⌘", "P"], description: "Save a new card" },
      { keys: ["⌘", "T"], description: "Jump to today's daily note" },
      { keys: ["G", "then", "H"], description: "Go to Home" },
      { keys: ["G", "then", "L"], description: "Go to Library" },
      { keys: ["G", "then", "C"], description: "Open Calendar" },
      { keys: ["G", "then", "N"], description: "Open Notes" },
    ],
  },
  {
    title: "Within Views",
    items: [
      { keys: ["/"], description: "Focus global search" },
      { keys: ["⌘", "Shift", "D"], description: "Open today's daily note" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
      { keys: ["Esc"], description: "Close open dialogs" },
    ],
  },
  {
    title: "Markdown Editor",
    items: [
      { keys: ["⌘", "B"], description: "Bold" },
      { keys: ["⌘", "I"], description: "Italic" },
      { keys: ["⌘", "K"], description: "Insert wiki-link" },
      { keys: ["⌘", "E"], description: "Inline code" },
      { keys: ["⌘", "Shift", "T"], description: "Toggle template picker" },
      { keys: ["⌘", "/"], description: "Toggle preview" },
    ],
  },
];

const pawkitGuides = [
  {
    icon: Bookmark,
    title: "Save anything instantly",
    description: "Hit ⌘+P from anywhere to capture a link. Cards appear in Home and Library automatically.",
  },
  {
    icon: Compass,
    title: "Organize with Pawkits",
    description: "Use the sidebar to drag cards into themed Pawkits or assign them from any card's details panel.",
  },
  {
    icon: FileText,
    title: "Daily notes that stick",
    description: "Press ⌘+T to jump into today's note. Templates keep recurring notes consistent.",
  },
  {
    icon: Star,
    title: "Backlinks & insight",
    description: "Notes automatically crosslink. Use the Links tab to explore connected ideas.",
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-10 prose prose-invert max-w-none">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
          <HelpCircle className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Help Center</h1>
          <p className="text-sm text-muted-foreground">
            Pawkit, demystified. Discover every power feature, master the hotkeys, and stay organized with confidence.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-2">
            <Command className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">Command Palette & Shortcuts</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Press <kbd className="rounded bg-white/10 px-2 py-1 font-mono text-xs">⌘</kbd>
            +<kbd className="rounded bg-white/10 px-2 py-1 font-mono text-xs">K</kbd> anywhere to search and run any action instantly.
            Need a refresher? Hit <kbd className="rounded bg-white/10 px-2 py-1 font-mono text-xs">?</kbd> to open the full keyboard reference.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {hotkeyGroups.map((group) => (
              <div key={group.title} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Keyboard className="h-4 w-4 text-accent" />
                  {group.title}
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {group.items.map((item) => (
                    <div key={item.description} className="flex items-center justify-between gap-4">
                      <span className="max-w-[60%] text-foreground-secondary">{item.description}</span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((key, index) => (
                          key.toLowerCase() === "then" ? (
                            <span key={`${item.description}-${index}`} className="text-xs text-muted">
                              then
                            </span>
                          ) : (
                            <kbd
                              key={`${item.description}-${index}`}
                              className="rounded-lg border border-white/10 bg-white/10 px-2 py-1 font-mono text-xs font-semibold text-foreground"
                            >
                              {key}
                            </kbd>
                          )
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-right text-xs text-muted-foreground">
            Want more? Press <kbd className="rounded bg-white/10 px-2 py-1 font-mono">?</kbd> anywhere to see the full shortcut list.
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">Pawkit Playbook</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Pawkits are themed spaces for your saved content. Use them like folders, collections, or projects—whatever keeps your ideas tidy.
          </p>
          <div className="mt-4 space-y-4">
            {pawkitGuides.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-3 rounded-2xl border border-white/5 bg-white/5 p-4">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-accent/10">
                  <Icon className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/pawkits"
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium text-foreground transition hover:border-accent hover:text-accent"
            >
              Explore all Pawkits
              <span className="text-muted-foreground">→</span>
            </Link>
            <Link
              href="/notes#daily"
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium text-foreground transition hover:border-accent hover:text-accent"
            >
              Daily note workflow
              <span className="text-muted-foreground">→</span>
            </Link>
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <div className="mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground">Feature Highlights</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Command Palette",
              description: "Launch the palette with ⌘K to search notes, cards, and actions instantly.",
            },
            {
              title: "Smart Capture",
              description: "Use Add Card or the browser extension to save articles, videos, and bookmarks in one click.",
            },
            {
              title: "Backlinks",
              description: "Notes automatically link to references. Check the Links tab inside any card for context.",
            },
            {
              title: "Gestures & Shortcuts",
              description: "Drag cards into Pawkits, use keyboard shortcuts to fly, and press ? whenever in doubt.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/5 bg-white/5 p-4">
              <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
