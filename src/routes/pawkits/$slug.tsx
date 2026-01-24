import { createFileRoute, useLocation } from '@tanstack/react-router'
import PawkitDetailPage from '@/pages/pawkit-detail'

export const Route = createFileRoute('/pawkits/$slug')({
  component: PawkitSlugRoute,
})

function PawkitSlugRoute() {
  // Derive slug from pathname to ensure it's always current
  const { pathname } = useLocation()
  const slug = pathname.split('/pawkits/')[1]?.split('/')[0] || ''

  // Key forces full remount when navigating between pawkits
  return <PawkitDetailPage key={slug} slug={slug} />
}
