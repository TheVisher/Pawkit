import { createFileRoute } from '@tanstack/react-router'
import { AuthShell } from '@/components/layout/auth-shell'
import LoginPage from '@/pages/login'

function LoginRoute() {
  return (
    <AuthShell>
      <LoginPage />
    </AuthShell>
  )
}

export const Route = createFileRoute('/login')({
  component: LoginRoute,
})
