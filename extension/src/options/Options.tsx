import { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import browser from 'webextension-polyfill'
import { Loader2, CheckCircle2, LogIn, ExternalLink, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import '../popup/index.css'

const PAWKIT_URL = 'https://www.getpawkit.com'

interface CheckAuthResponse {
  ok: boolean
  error?: string
  user?: {
    email: string | null
  }
}

function Options() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await browser.runtime.sendMessage({ type: 'CHECK_AUTH' }) as CheckAuthResponse
      setIsAuthenticated(response.ok)
      if (response.user?.email) {
        setUserEmail(response.user.email)
      }
      if (!response.ok && response.error) {
        setError(response.error)
      }
    } catch (err) {
      console.error('Failed to check auth:', err)
      setIsAuthenticated(false)
      setError('Failed to check authentication status')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenPawkit = () => {
    window.open(PAWKIT_URL, '_blank')
  }

  const handleLogin = async () => {
    try {
      await browser.runtime.sendMessage({ type: 'INITIATE_LOGIN' })
    } catch (err) {
      console.error('Failed to initiate login:', err)
    }
  }

  const handleLogout = async () => {
    try {
      await browser.runtime.sendMessage({ type: 'LOGOUT' })
      setIsAuthenticated(false)
      setUserEmail(null)
    } catch (err) {
      console.error('Failed to logout:', err)
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Pawkit Web Clipper Settings</h1>
          <p className="text-muted-foreground mt-2">
            Save pages to your Pawkit with one click
          </p>
        </div>

        <Separator />

        {/* Authentication status */}
        <Card>
        <CardHeader>
          <CardTitle>Authentication Status</CardTitle>
          <CardDescription>
              Connect with an extension token to save pages from anywhere
          </CardDescription>
        </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Checking authentication...</span>
              </div>
            ) : isAuthenticated ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">You are logged in</span>
                </div>
                {userEmail && (
                  <p className="text-sm text-muted-foreground">
                    Signed in as <span className="font-medium">{userEmail}</span>
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  You can now save pages to Pawkit from any website.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleOpenPawkit}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Pawkit
                  </Button>
                  <Button variant="ghost" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Connect your extension token to start saving pages, articles, and links.
                </p>

                {error && (
                  <div className="text-sm text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded p-2">
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleLogin}
                  className="w-full bg-gradient-to-r from-[#6d5cff] to-[#a36bff] hover:from-[#5d4cef] hover:to-[#9358ef]"
                  size="lg"
                >
                  <LogIn className="mr-2 h-5 w-5" />
                  Open Pawkit Settings
                </Button>

                <Button
                  variant="ghost"
                  onClick={checkAuthStatus}
                  className="w-full"
                >
                  <Loader2 className="mr-2 h-4 w-4" />
                  Check again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help */}
        <Card>
          <CardHeader>
            <CardTitle>How to use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <ol className="list-decimal list-inside space-y-2">
              <li>Open Pawkit settings and generate an Extension Token</li>
              <li>Paste the token into the extension popup</li>
              <li>Click the extension icon on any page to save it to Pawkit</li>
              <li>Or right-click any page or link and select "Save to Pawkit"</li>
            </ol>
            <p className="mt-4 pt-4 border-t border-border">
              <strong>Tip:</strong> You can also pick a custom thumbnail from any page and add notes before saving.
            </p>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Pawkit Web Clipper stores an extension token so you can save pages without keeping Pawkit open.
              You can revoke or regenerate the token anytime from Pawkit settings.
            </p>
            <p className="mt-2">
              Version 1.2.0
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Render the Options component
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element with id="root" not found in DOM');
}
ReactDOM.createRoot(rootElement).render(<Options />);
