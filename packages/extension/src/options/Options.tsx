import { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import browser from 'webextension-polyfill'
import { Loader2, CheckCircle2, LogIn, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import '../popup/index.css'

const PAWKIT_URL = 'https://www.getpawkit.com'

function Options() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await browser.runtime.sendMessage({ type: 'CHECK_AUTH' })
      setIsAuthenticated(response.ok)
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
              The extension uses your Pawkit login session
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
                <p className="text-sm text-muted-foreground">
                  You can now save pages to Pawkit using the extension.
                </p>
                <Button variant="outline" onClick={handleOpenPawkit}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Pawkit
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Please log in to Pawkit in your browser to use the extension.
                </p>

                {error && (
                  <div className="text-sm text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded p-2">
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleOpenPawkit}
                  className="w-full bg-gradient-to-r from-[#6d5cff] to-[#a36bff] hover:from-[#5d4cef] hover:to-[#9358ef]"
                  size="lg"
                >
                  <LogIn className="mr-2 h-5 w-5" />
                  Log in to Pawkit
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
              <li>Log in to <a href={PAWKIT_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">getpawkit.com</a> in your browser</li>
              <li>Click the extension icon on any page to save it to Pawkit</li>
              <li>Right-click any page or link and select "Save page to Pawkit"</li>
              <li>Add optional notes before saving</li>
            </ol>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Pawkit Web Clipper uses your existing login session from getpawkit.com.
              There's no need for separate authentication - just log in once and the
              extension will work automatically.
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
