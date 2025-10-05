'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Loader2 } from 'lucide-react'

export default function ExtensionAuthPage() {
  const [loading, setLoading] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Check if opened from extension
    const params = new URLSearchParams(window.location.search)
    const fromExtension = params.get('source') === 'extension'

    if (!fromExtension) {
      setError('This page should only be accessed from the Pawkit browser extension.')
    }
  }, [])

  const handleAuthorize = async () => {
    setLoading(true)
    setError('')

    try {
      // Generate extension token
      const response = await fetch('/api/extension/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to generate token')
      }

      const data = await response.json()

      // Send token to extension
      if (window.opener) {
        window.opener.postMessage(
          {
            type: 'PAWKIT_AUTH_SUCCESS',
            token: data.token
          },
          window.location.origin
        )

        setAuthorized(true)

        // Close window after 2 seconds
        setTimeout(() => {
          window.close()
        }, 2000)
      } else {
        setError('Could not communicate with extension. Please try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authorization failed')
    } finally {
      setLoading(false)
    }
  }

  if (authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle2 className="h-6 w-6" />
              <CardTitle>Authorization Successful</CardTitle>
            </div>
            <CardDescription>
              You can now close this window and start using the Pawkit Web Clipper.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Authorize Pawkit Web Clipper</CardTitle>
          <CardDescription>
            Grant the browser extension access to save pages to your Pawkit account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded p-3">
              {error}
            </div>
          )}

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>The extension will be able to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Save web pages to your Pawkit collections</li>
              <li>Create new cards on your behalf</li>
              <li>Access your collection information</li>
            </ul>
          </div>

          <Button
            onClick={handleAuthorize}
            disabled={loading || !!error}
            className="w-full bg-gradient-to-r from-[#6d5cff] to-[#a36bff] hover:from-[#5d4cef] hover:to-[#9358ef]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Authorizing...
              </>
            ) : (
              'Authorize Extension'
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            You can revoke access anytime from your account settings
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
