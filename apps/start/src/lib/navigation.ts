import { useLocation, useNavigate, useRouter as useTanstackRouter } from '@tanstack/react-router'
import { useMemo } from 'react'

type NavigateOptions = {
  scroll?: boolean
}

export function usePathname() {
  return useLocation().pathname
}

export function useSearchParams() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

export function useRouter() {
  const router = useTanstackRouter()
  const navigate = useNavigate()

  return {
    push: (to: string) => navigate({ to }),
    replace: (to: string, opts?: NavigateOptions) =>
      navigate({ to, replace: true, resetScroll: opts?.scroll }),
    refresh: () => {
      router.invalidate()
      void router.load()
    },
    prefetch: (to: string) => router.preloadRoute({ to }),
  }
}
