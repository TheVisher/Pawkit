import { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import browser from 'webextension-polyfill'
import { Eye, EyeOff, Loader2, CheckCircle2, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { SetTokenMessage } from '@/shared/types'
import '../popup/index.css'

const AUTH_URL = 'https://pawkit.vercel.app/extension/auth?source=extension'

function Options() {
  const [token, setToken] = useState('')
  const [currentToken, setCurrentToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [loading, setLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Load current token
    const loadToken = async () => {
      try {
        const response = await browser.runtime.sendMessage({ type: 'GET_TOKEN' })
        if (response.token) {
          setCurrentToken(response.token)
        }
      } catch (error) {
        console.error('Failed to load token:', error)
      }
    }

    loadToken()

    // Listen for auth messages from popup
    const handleMessage = (event: MessageEvent) => {
      // Verify origin
      if (event.origin !== 'https://pawkit.vercel.app') {
        return
      }

      if (event.data.type === 'PAWKIT_AUTH_SUCCESS' && event.data.token) {
        handleTokenReceived(event.data.token)
      }
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [])

  const handleTokenReceived = async (receivedToken: string) => {
    setAuthLoading(false)

    try {
      const message: SetTokenMessage = {
        type: 'SET_TOKEN',
        token: receivedToken
      }

      await browser.runtime.sendMessage(message)
      setCurrentToken(receivedToken)
      setSaved(true)
      setError('')

      // Clear success message after 3 seconds
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save token')
    }
  }

  const handleSignInWithPawkit = () => {
    setAuthLoading(true)
    setError('')

    // Open auth popup
    const width = 500
    const height = 600
    const left = (window.screen.width - width) / 2
    const top = (window.screen.height - height) / 2

    window.open(
      AUTH_URL,
      'Pawkit Authorization',
      `width=${width},height=${height},left=${left},top=${top}`
    )
  }

  const handleSave = async () => {
    if (!token.trim()) {
      setError('Token cannot be empty')
      return
    }

    setLoading(true)
    setError('')
    setSaved(false)

    try {
      const message: SetTokenMessage = {
        type: 'SET_TOKEN',
        token: token.trim()
      }

      await browser.runtime.sendMessage(message)
      setCurrentToken(token.trim())
      setToken('')
      setSaved(true)

      // Clear success message after 3 seconds
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save token')
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = async () => {
    try {
      const message: SetTokenMessage = {
        type: 'SET_TOKEN',
        token: ''
      }

      await browser.runtime.sendMessage(message)
      setCurrentToken('')
      setToken('')
      setSaved(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke token')
    }
  }

  const maskToken = (token: string) => {
    if (token.length <= 8) return '•'.repeat(token.length)
    // Show first 4 and last 4 characters with dots in between
    return token.slice(0, 4) + '•'.repeat(Math.min(20, token.length - 8)) + token.slice(-4)
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Pawkit Web Clipper Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure your authentication token to save pages to Pawkit
          </p>
        </div>

        <Separator />

        {/* Current token status */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
            <CardDescription>
              {currentToken
                ? 'You are authenticated and ready to save pages'
                : 'No authentication token set'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentToken ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Label>Current Token:</Label>
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {showToken ? currentToken : maskToken(currentToken)}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button variant="destructive" onClick={handleRevoke}>
                  Revoke Token
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Set your token below to start saving pages
              </p>
            )}
          </CardContent>
        </Card>

        {/* Sign in with Pawkit */}
        <Card>
          <CardHeader>
            <CardTitle>Easy Setup</CardTitle>
            <CardDescription>
              Sign in with your Pawkit account to authorize the extension
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleSignInWithPawkit}
              disabled={authLoading}
              className="w-full bg-gradient-to-r from-[#6d5cff] to-[#a36bff] hover:from-[#5d4cef] hover:to-[#9358ef]"
              size="lg"
            >
              {authLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Waiting for authorization...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  Sign in with Pawkit
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">OR</span>
          <Separator className="flex-1" />
        </div>

        {/* Set new token manually */}
        <Card>
          <CardHeader>
            <CardTitle>Manual Token Setup</CardTitle>
            <CardDescription>
              Advanced: Manually paste your authentication token
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Personal Access Token</Label>
              <Input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your token here..."
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Your token is stored locally and used to authenticate API requests
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded p-2">
                {error}
              </div>
            )}

            {/* Success message */}
            {saved && (
              <div className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded p-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Token saved successfully!</span>
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={loading || !token.trim()}
              className="bg-gradient-to-r from-[#6d5cff] to-[#a36bff] hover:from-[#5d4cef] hover:to-[#9358ef]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Token'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Help */}
        <Card>
          <CardHeader>
            <CardTitle>How to use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <ol className="list-decimal list-inside space-y-2">
              <li>Click "Sign in with Pawkit" to authorize the extension</li>
              <li>Click the extension icon on any page to save it to Pawkit</li>
              <li>Right-click any page or link and select "Save page to Pawkit"</li>
              <li>Add optional notes before saving</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Render the Options component
ReactDOM.createRoot(document.getElementById('root')!).render(<Options />)
