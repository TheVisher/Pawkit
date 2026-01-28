import { Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import PawkitsPage from '@/pages/pawkits'

function PawkitsLoading() {
  return (
    <div className="flex-1">
      <div className="pt-5 pb-4 px-4 md:px-6 min-h-[76px]">
        <div className="w-fit space-y-0.5">
          <div className="text-xs text-text-muted">Loading...</div>
          <h1 className="text-2xl font-semibold text-text-primary">Pawkits</h1>
        </div>
      </div>
      <div className="px-6 pt-4 pb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-40 rounded-2xl animate-pulse bg-bg-surface-2"
          />
        ))}
      </div>
    </div>
  )
}

export const Route = createFileRoute('/pawkits/')({
  loader: () => {
    // Route metadata - enables future prefetch integration
    return { routeId: 'pawkits' }
  },
  component: PawkitsIndexRoute,
})

function PawkitsIndexRoute() {
  return (
    <Suspense fallback={<PawkitsLoading />}>
      <PawkitsPage />
    </Suspense>
  )
}
