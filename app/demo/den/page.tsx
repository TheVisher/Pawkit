"use client";

import { DogHouseIcon } from "@/components/icons/dog-house";

export default function DemoDenPage() {
  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <DogHouseIcon className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-100">The Den</h1>
            <p className="text-sm text-muted-foreground">
              Your private, secure storage
            </p>
          </div>
        </div>
      </div>

      {/* Empty State */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-100">All Den Cards</h2>
        <div className="rounded-lg border border-dashed border-gray-800 bg-gray-950 p-12 text-center">
          <DogHouseIcon className="mx-auto h-12 w-12 text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-gray-300">
            The Den is a premium feature
          </h3>
          <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
            The Den provides end-to-end encrypted storage for your most sensitive bookmarks.
            Move items here to keep them completely private and hidden from your main library.
          </p>
          <p className="mt-4 text-xs text-gray-600">
            This is a demo - The Den would appear here in the full version
          </p>
        </div>
      </div>
    </div>
  );
}
