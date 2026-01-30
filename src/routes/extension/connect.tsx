import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Loader2, Link2, AlertCircle, ExternalLink } from 'lucide-react'

type ConnectionStatus = 'idle' | 'generating' | 'connecting' | 'success' | 'error' | 'no-extension'

function ExtensionConnectPage() {
  const navigate = useNavigate()
  const user = useQuery(api.users.me)
  const generateExtensionToken = useMutation(api.users.generateExtensionToken)

  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  // Listen for ACK from content script
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from same origin
      if (event.origin !== window.location.origin) return

      if (event.data?.type === 'PAWKIT_EXTENSION_CONNECTED') {
        if (event.data.success) {
          setStatus('success')
        } else {
          setStatus('error')
          setError('Failed to save token in extension')
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Track timeout for cleanup
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleConnect = async () => {
    setError(null)
    setStatus('generating')

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    try {
      // Generate the extension token
      const result = await generateExtensionToken()

      if (!result?.token) {
        throw new Error('Failed to generate token')
      }

      setStatus('connecting')

      // Post token to content script
      // Uses window.location.origin for security (not '*')
      window.postMessage(
        { type: 'PAWKIT_EXTENSION_TOKEN', token: result.token },
        window.location.origin
      )

      // Set timeout for no extension response
      timeoutRef.current = setTimeout(() => {
        setStatus((currentStatus) => {
          if (currentStatus === 'connecting') {
            return 'no-extension'
          }
          return currentStatus
        })
      }, 3000)

    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to connect')
    }
  }

  // Not logged in - redirect to login with return URL
  if (user === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-purple-500/10">
              <Link2 className="h-8 w-8 text-purple-400" />
            </div>
            <CardTitle className="text-xl text-zinc-100">Connect Extension</CardTitle>
            <CardDescription className="text-zinc-400">
              Sign in to connect your browser extension
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate({ to: '/login', search: { redirectTo: '/extension/connect' } })}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Sign in to continue
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Still loading user
  if (user === undefined) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-purple-500/10">
            {status === 'success' ? (
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            ) : status === 'error' || status === 'no-extension' ? (
              <AlertCircle className="h-8 w-8 text-amber-400" />
            ) : (
              <Link2 className="h-8 w-8 text-purple-400" />
            )}
          </div>
          <CardTitle className="text-xl text-zinc-100">
            {status === 'success' ? 'Connected!' :
             status === 'no-extension' ? 'Extension Not Detected' :
             'Connect Extension'}
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {status === 'success' ? (
              'Your browser extension is now connected to Pawkit'
            ) : status === 'no-extension' ? (
              'Make sure the Pawkit extension is installed and enabled'
            ) : (
              <>Signed in as <span className="text-zinc-300">{user.email}</span></>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'success' ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-400 text-center">
                You can now save pages from anywhere on the web using the extension.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate({ to: '/library' })}
                >
                  Go to Library
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => window.close()}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : status === 'no-extension' ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-400 text-center">
                If you have the extension installed, try refreshing this page or check that it&apos;s enabled.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.location.reload()}
                >
                  Refresh Page
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate({ to: '/settings' })}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Get Token Manually
                </Button>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-md">
                  {error}
                </div>
              )}

              <Button
                onClick={handleConnect}
                disabled={status === 'generating' || status === 'connecting'}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {status === 'generating' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating token...
                  </>
                ) : status === 'connecting' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Link2 className="mr-2 h-4 w-4" />
                    Connect Extension
                  </>
                )}
              </Button>

              <p className="text-xs text-zinc-500 text-center">
                This will generate a secure token and send it to your extension
              </p>
              <p className="text-xs text-amber-500/80 text-center">
                Note: This will disconnect any other browsers using your previous token
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/extension/connect')({
  component: ExtensionConnectPage,
})
