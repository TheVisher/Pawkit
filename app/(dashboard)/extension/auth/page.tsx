'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Loader2, Copy, Check } from 'lucide-react'

export default function ExtensionAuthPage() {
  const [loading, setLoading] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState('')
  const [copied, setCopied] = useState(false)

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

      // Store token to display to user
      setToken(data.token)
      setAuthorized(true)

      // Try to send to extension via window.opener
      if (window.opener) {
        try {
          window.opener.postMessage(
            {
              type: 'PAWKIT_AUTH_SUCCESS',
              token: data.token
            },
            '*' // Allow any origin for extension communication
          )

          // Close window after 3 seconds if successful
          setTimeout(() => {
            window.close()
          }, 3000)
        } catch (e) {
          // If postMessage fails, user can copy token manually
          console.log('Could not auto-send token, user will copy manually')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authorization failed')
    } finally {
      setLoading(false)
    }
  }

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy token:', err)
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
              Copy your token below and paste it in the extension
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Extension Token</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={token}
                  readOnly
                  className="flex-1 px-3 py-2 bg-muted border border-border rounded-md text-sm font-mono"
                />
                <Button
                  onClick={copyToken}
                  variant="outline"
                  size="icon"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This window will close automatically, or you can close it manually after copying.
              </p>
            </div>
          </CardContent>
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
