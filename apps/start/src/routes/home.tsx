import { createFileRoute } from '@tanstack/react-router'
import HomePage from '@/pages/home'

function HomeRoute() {
  return <HomePage />
}

export const Route = createFileRoute('/home')({
  component: HomeRoute,
})
