import { createFileRoute } from '@tanstack/react-router'
import TagsPage from '@/pages/tags'

function TagsRoute() {
  return <TagsPage />
}

export const Route = createFileRoute('/tags')({
  component: TagsRoute,
})
