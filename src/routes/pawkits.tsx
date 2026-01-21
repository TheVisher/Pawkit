import { createFileRoute } from '@tanstack/react-router'
import PawkitsPage from '@/pages/pawkits'

function PawkitsRoute() {
  return <PawkitsPage />
}

export const Route = createFileRoute('/pawkits')({
  component: PawkitsRoute,
})
