import { createFileRoute } from '@tanstack/react-router'
import { AuthShell } from '@/components/layout/auth-shell'
import ForgotPasswordPage from '@/pages/forgot-password'

function ForgotPasswordRoute() {
  return (
    <AuthShell>
      <ForgotPasswordPage />
    </AuthShell>
  )
}

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordRoute,
})
