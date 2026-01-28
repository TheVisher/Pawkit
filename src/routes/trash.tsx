import { Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import TrashPage from '@/pages/trash'

function TrashLoading() {
  return (
    <div className="flex-1">
      <div className="pt-5 pb-4 px-4 md:px-6 min-h-[76px]">
        <div className="flex items-start justify-between gap-4">
          <div className="w-fit space-y-0.5">
            <div className="text-xs text-text-muted">Loading...</div>
            <h1 className="text-2xl font-semibold text-text-primary">Trash</h1>
          </div>
        </div>
      </div>
      <div className="px-4 md:px-6 pt-4 pb-6">
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-lg animate-pulse bg-bg-surface-2"
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/trash')({
  loader: () => {
    // Route metadata - enables future prefetch integration
    return { routeId: 'trash' }
  },
  component: TrashRoute,
})

function TrashRoute() {
  return (
    <Suspense fallback={<TrashLoading />}>
      <TrashPage />
    </Suspense>
  )
}
