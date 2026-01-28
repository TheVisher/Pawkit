import { Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import LibraryPage from '@/pages/library'

function LibraryLoading() {
  return (
    <div className="flex-1">
      <div className="pt-5 pb-4 px-4 md:px-6">
        <div className="h-8 w-32 bg-bg-surface-2 rounded animate-pulse" />
      </div>
      <div className="px-6 pt-4 pb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-48 rounded-2xl animate-pulse bg-bg-surface-2"
          />
        ))}
      </div>
    </div>
  )
}

export const Route = createFileRoute('/library')({
  loader: () => {
    // Route metadata - enables future prefetch integration
    return { routeId: 'library' }
  },
  component: LibraryRoute,
})

function LibraryRoute() {
  return (
    <Suspense fallback={<LibraryLoading />}>
      <LibraryPage />
    </Suspense>
  )
}
