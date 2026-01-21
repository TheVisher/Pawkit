import { createFileRoute } from '@tanstack/react-router'
import LibraryPage from '@/pages/library'

function LibraryRoute() {
  return <LibraryPage />
}

export const Route = createFileRoute('/library')({
  component: LibraryRoute,
})
