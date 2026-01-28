import { Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import TagsPage from '@/pages/tags'

function TagsLoading() {
  return (
    <div className="flex-1">
      <div className="pt-5 pb-4 px-4 md:px-6">
        <div className="h-8 w-24 bg-bg-surface-2 rounded animate-pulse" />
      </div>
      <div className="px-4 md:px-6 pt-4 pb-6">
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="break-inside-avoid mb-6">
              <div className="h-6 w-8 bg-bg-surface-2 rounded animate-pulse mb-2" />
              <div className="space-y-1.5">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="h-8 bg-bg-surface-2 rounded animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/tags')({
  loader: () => {
    // Route metadata - enables future prefetch integration
    return { routeId: 'tags' }
  },
  component: TagsRoute,
})

function TagsRoute() {
  return (
    <Suspense fallback={<TagsLoading />}>
      <TagsPage />
    </Suspense>
  )
}
