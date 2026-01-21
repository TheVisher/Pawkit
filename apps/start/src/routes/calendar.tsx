import { createFileRoute } from '@tanstack/react-router'
import CalendarPage from '@/pages/calendar'

function CalendarRoute() {
  return <CalendarPage />
}

export const Route = createFileRoute('/calendar')({
  component: CalendarRoute,
})
