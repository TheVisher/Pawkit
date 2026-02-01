import { Suspense } from 'react'
import { createFileRoute, notFound, useLocation } from '@tanstack/react-router'
import PawkitDetailPage from '@/pages/pawkit-detail'

function PawkitDetailLoading() {
  return (
    <div className="flex-1">
      <div className="pt-5 pb-4 px-4 md:px-6">
        <div className="h-8 w-32 bg-bg-surface-2 rounded animate-pulse" />
      </div>
      <div className="px-4 md:px-6 pt-4 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-2xl animate-pulse bg-bg-surface-2"
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/pawkits/$slug')({
  beforeLoad: ({ params }) => {
    // Validate slug format (alphanumeric, hyphens, underscores)
    if (!params.slug || !/^[\w-]+$/.test(params.slug)) {
      throw notFound()
    }
  },
  component: PawkitSlugRoute,
})

function PawkitSlugRoute() {
  // Use useLocation instead of Route.useParams to ensure slug always matches
  // the current URL. Route.useParams can lag behind during navigation transitions,
  // causing the content to be "one click behind" the sidebar highlight.
  const { pathname } = useLocation()
  const slug = (pathname.split('/pawkits/')[1] || '').split('/')[0]

  return (
    <Suspense fallback={<PawkitDetailLoading />}>
      <PawkitDetailPage key={slug} slug={slug} />
    </Suspense>
  )
}
