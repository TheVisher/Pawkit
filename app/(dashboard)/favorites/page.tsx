"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { Star } from "lucide-react";

export default function FavoritesPage() {
  const pathname = usePathname();
  const setLibraryControls = usePanelStore((state) => state.setLibraryControls);

  // Set sidebar content type when this page loads
  useEffect(() => {
    setLibraryControls();
  }, [setLibraryControls, pathname]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
          <Star className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Favorites</h1>
          <p className="text-sm text-muted-foreground">
            Mark cards as favourites to surface them here. Filtering and pinning options are in progress.
          </p>
        </div>
      </div>
    </div>
  );
}
