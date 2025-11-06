"use client";

import { useRouter } from "next/navigation";
import { Sparkles, Plus, FileText } from "lucide-react";

export function QuickActionsCard() {
  const router = useRouter();

  const actions = [
    {
      icon: Sparkles,
      label: "Rediscover",
      description: "Review never-opened bookmarks",
      onClick: () => router.push('/library?mode=rediscover'),
      color: "from-purple-500/20 to-pink-500/20",
      hoverColor: "hover:from-purple-500/30 hover:to-pink-500/30",
    },
    {
      icon: Plus,
      label: "Add Bookmark",
      description: "Save a new link",
      onClick: () => {
        // Trigger the extension or show add modal
        // For now, just navigate to library
        router.push('/library');
      },
      color: "from-blue-500/20 to-cyan-500/20",
      hoverColor: "hover:from-blue-500/30 hover:to-cyan-500/30",
    },
    {
      icon: FileText,
      label: "New Note",
      description: "Create a quick note",
      onClick: () => {
        // This would trigger the create note modal
        // For now, navigate to notes view
        router.push('/notes');
      },
      color: "from-green-500/20 to-emerald-500/20",
      hoverColor: "hover:from-green-500/30 hover:to-emerald-500/30",
    },
  ];

  return (
    <div className="rounded-2xl border border-subtle bg-surface p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={`flex flex-col items-start gap-2 p-4 rounded-xl bg-gradient-to-br ${action.color} ${action.hoverColor} border border-white/10 hover:border-white/20 transition-all group text-left`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 group-hover:bg-white/20 transition-colors">
              <action.icon className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <div className="font-medium text-foreground">{action.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{action.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
