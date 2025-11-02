"use client";

import Link from "next/link";
import { BookOpen, FolderOpen, StickyNote, Sparkles } from "lucide-react";
import { GlowButton } from "@/components/ui/glow-button";

export default function DemoHubPage() {
  const demoViews = [
    {
      title: "Library View",
      description: "Browse your complete collection of bookmarks with grid, list, and timeline layouts",
      icon: BookOpen,
      href: "/demo/library",
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Pawkits View",
      description: "Organize bookmarks into visual collections with preview cards and nested hierarchies",
      icon: FolderOpen,
      href: "/demo/pawkits",
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Notes View",
      description: "Create and manage markdown notes with rich formatting and daily note templates",
      icon: StickyNote,
      href: "/demo/notes",
      color: "text-green-400",
      bgColor: "bg-green-500/10",
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-5xl w-full space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30">
              <Sparkles className="h-8 w-8 text-purple-400" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground">Pawkit Demo Showcase</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore different views of Pawkit with realistic demo data. Perfect for screenshots and demonstrations.
          </p>
        </div>

        {/* Demo View Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {demoViews.map((view) => {
            const Icon = view.icon;
            return (
              <Link
                key={view.href}
                href={view.href}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-surface p-6 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10"
              >
                <div className="space-y-4">
                  {/* Icon */}
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${view.bgColor}`}>
                    <Icon className={`h-6 w-6 ${view.color}`} />
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-foreground group-hover:text-purple-400 transition-colors">
                      {view.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {view.description}
                    </p>
                  </div>

                  {/* Arrow indicator */}
                  <div className="flex items-center text-sm font-medium text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    View demo →
                  </div>
                </div>

                {/* Glow effect on hover */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/0 to-blue-500/0 group-hover:from-purple-500/5 group-hover:to-blue-500/5 transition-all duration-300" />
              </Link>
            );
          })}
        </div>

        {/* Info Section */}
        <div className="text-center space-y-4 pt-8">
          <div className="rounded-xl border border-white/10 bg-surface/50 backdrop-blur-sm p-6 max-w-2xl mx-auto">
            <h2 className="text-lg font-semibold text-foreground mb-2">Demo Data</h2>
            <p className="text-sm text-muted-foreground">
              All demo pages use realistic fake data with:
            </p>
            <ul className="mt-3 text-sm text-muted-foreground space-y-1">
              <li>• 30+ bookmarks across tech, design, recipes, travel, and more</li>
              <li>• 11 organized collections (Pawkits) with cover images</li>
              <li>• Multiple markdown notes with real content</li>
              <li>• Full 3-panel dashboard layout with working navigation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
