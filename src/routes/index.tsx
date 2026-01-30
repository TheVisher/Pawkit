import { createFileRoute } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import { useEffect } from 'react'
import { useRouter } from '@/lib/navigation'
import { LandingPage } from '@/components/landing/landing-page'

function IndexRoute() {
  const router = useRouter()
  const { isLoading, isAuthenticated } = useConvexAuth()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/home')
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0814]">
        <div className="text-zinc-400">Loading...</div>
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0814]">
        <div className="text-zinc-400">Redirecting...</div>
      </div>
    )
  }

  return <LandingPage />
}

export const Route = createFileRoute('/')({
  component: IndexRoute,
})
