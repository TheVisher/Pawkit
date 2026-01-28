import { Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import HomePage from '@/pages/home'

function HomeLoading() {
  return (
    <div className="flex-1 p-6 animate-pulse">
      <div className="h-8 w-48 bg-bg-surface-2 rounded mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="h-40 bg-bg-surface-2 rounded-2xl" />
        <div className="h-40 bg-bg-surface-2 rounded-2xl" />
        <div className="h-40 bg-bg-surface-2 rounded-2xl" />
      </div>
    </div>
  )
}

export const Route = createFileRoute('/home')({
  loader: () => {
    // Route metadata - enables future prefetch integration
    return { routeId: 'home' }
  },
  component: HomeRoute,
})

function HomeRoute() {
  return (
    <Suspense fallback={<HomeLoading />}>
      <HomePage />
    </Suspense>
  )
}
