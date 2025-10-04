"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LayoutMode, LAYOUTS } from "@/lib/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

type NotesHeaderProps = {
  noteCount: number;
  initialLayout: LayoutMode;
};

export function NotesHeader({ noteCount, initialLayout }: NotesHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleLayoutChange = (layout: LayoutMode) => {
    localStorage.setItem("notes-layout", layout);
    const params = new URLSearchParams(searchParams?.toString());
    params.set("layout", layout);
    const currentPath = window.location.pathname;
    router.push(`${currentPath}?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold text-foreground">Notes</h1>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg bg-surface-soft px-3 py-2 text-sm text-foreground hover:bg-surface transition-colors">
          <span className="capitalize">{initialLayout}</span>
          <ChevronDown className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {LAYOUTS.map((layout) => (
            <DropdownMenuItem
              key={layout}
              onClick={() => handleLayoutChange(layout)}
              className="capitalize cursor-pointer"
            >
              {layout}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
