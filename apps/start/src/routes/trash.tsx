import { createFileRoute } from '@tanstack/react-router'
import TrashPage from '@/pages/trash'

function TrashRoute() {
  return <TrashPage />
}

export const Route = createFileRoute('/trash')({
  component: TrashRoute,
})
