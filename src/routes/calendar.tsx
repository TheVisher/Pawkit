import { Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import CalendarPage from '@/pages/calendar'

function CalendarLoading() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="h-16 px-4 md:px-6 flex items-center">
        <div className="h-8 w-48 bg-bg-surface-2 rounded animate-pulse" />
      </div>
      <div className="flex-1 overflow-hidden p-4 md:p-6">
        <div className="h-full bg-bg-surface-2 rounded-2xl animate-pulse" />
      </div>
    </div>
  )
}

export const Route = createFileRoute('/calendar')({
  loader: () => {
    // Route metadata - enables future prefetch integration
    return { routeId: 'calendar' }
  },
  component: CalendarRoute,
})

function CalendarRoute() {
  return (
    <Suspense fallback={<CalendarLoading />}>
      <CalendarPage />
    </Suspense>
  )
}
