import { createFileRoute } from '@tanstack/react-router'
import PawkitsPage from '@/pages/pawkits'

function PawkitsIndexRoute() {
  return <PawkitsPage />
}

export const Route = createFileRoute('/pawkits/')({
  component: PawkitsIndexRoute,
})
