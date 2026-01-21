import { createFileRoute } from '@tanstack/react-router'
import { AuthShell } from '@/components/layout/auth-shell'
import SignupPage from '@/pages/signup'

function SignupRoute() {
  return (
    <AuthShell>
      <SignupPage />
    </AuthShell>
  )
}

export const Route = createFileRoute('/signup')({
  component: SignupRoute,
})
