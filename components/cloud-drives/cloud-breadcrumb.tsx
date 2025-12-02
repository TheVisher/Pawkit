"use client";

import { ChevronRight, Home } from "lucide-react";

interface CloudBreadcrumbProps {
  path: string;
  onNavigate: (path: string) => void;
}

export function CloudBreadcrumb({ path, onNavigate }: CloudBreadcrumbProps) {
  // Split path into segments, e.g., "/Pawkit/_Notes" -> ["Pawkit", "_Notes"]
  const segments = path.split("/").filter(Boolean);

  // Build path array for navigation
  const pathSegments = segments.map((segment, index) => ({
    name: segment,
    path: "/" + segments.slice(0, index + 1).join("/"),
  }));

  return (
    <nav className="flex items-center gap-1 text-sm">
      <button
        onClick={() => onNavigate("/")}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        title="Root"
      >
        <Home className="h-4 w-4" />
      </button>

      {pathSegments.map((segment, index) => (
        <div key={segment.path} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4 text-gray-600" />
          <button
            onClick={() => onNavigate(segment.path)}
            className={`px-2 py-1 rounded-md transition-colors ${
              index === pathSegments.length - 1
                ? "text-white font-medium"
                : "text-gray-400 hover:text-white hover:bg-white/10"
            }`}
          >
            {segment.name}
          </button>
        </div>
      ))}
    </nav>
  );
}
