import { useState, useEffect } from 'react'
import browser from 'webextension-polyfill'
import { Loader2, Settings, ExternalLink, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { SaveCardMessage, SaveCardResponse } from '@/shared/types'

export function Popup() {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [favicon, setFavicon] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [savedCardId, setSavedCardId] = useState<string | null>(null)
  const [hasToken, setHasToken] = useState(false)

  useEffect(() => {
    // Get current tab info and token status
    const initializePopup = async () => {
      try {
        const [tab] = await browser.tabs.query({
          active: true,
          currentWindow: true
        })

        if (tab) {
          setTitle(tab.title || '')
          setUrl(tab.url || '')

          // Set favicon
          if (tab.url) {
            const domain = new URL(tab.url).hostname
            setFavicon(`https://www.google.com/s2/favicons?domain=${domain}&sz=32`)
          }
        }

        // Check if token exists
        const response = await browser.runtime.sendMessage({ type: 'GET_TOKEN' })
        setHasToken(!!response.token)
      } catch (error) {
        console.error('Failed to initialize popup:', error)
      }
    }

    initializePopup()
  }, [])

  const handleSave = async () => {
    if (!title.trim() || !url.trim()) {
      setError('Title and URL are required')
      return
    }

    if (!hasToken) {
      setError('No authentication token found. Please set your token in options.')
      return
    }

    setLoading(true)
    setError('')
    setSaved(false)

    try {
      const message: SaveCardMessage = {
        type: 'SAVE_CARD',
        payload: {
          title: title.trim(),
          url: url.trim(),
          notes: notes.trim() || undefined,
          source: 'webext',
          meta: {
            favicon
          }
        }
      }

      const response = await browser.runtime.sendMessage(message) as SaveCardResponse

      if (response.ok) {
        setSaved(true)
        setSavedCardId(response.data?.id || null)
        // Clear notes after successful save
        setNotes('')
        // Service worker will notify content scripts to refresh the page
      } else {
        setError(response.error || 'Failed to save card')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save card')
    } finally {
      setLoading(false)
    }
  }

  const openOptions = () => {
    browser.runtime.openOptionsPage()
  }

  const openSavedCard = () => {
    // Open home page where saved cards are displayed
    browser.tabs.create({
      url: `https://pawkit.vercel.app/home`
    })
  }

  return (
    <div className="w-96 min-h-[400px]">
      <Card className="border-0 rounded-none shadow-none">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Save to Pawkit</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={openOptions}
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          {!hasToken && (
            <div className="text-xs text-muted-foreground bg-destructive/10 border border-destructive/20 rounded p-2 mt-2">
              No token set. Click the settings icon to add your authentication token.
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Favicon and URL preview */}
          {favicon && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <img src={favicon} alt="" className="w-4 h-4" />
              <span className="truncate">{new URL(url).hostname}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Page title"
              disabled={loading}
            />
          </div>

          {/* URL */}
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              disabled={loading}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your notes..."
              className="min-h-[100px] resize-none"
              disabled={loading}
            />
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
              <span>Saved successfully!</span>
              {savedCardId && (
                <Button
                  variant="link"
                  size="sm"
                  className="ml-auto h-auto p-0 text-green-400"
                  onClick={openSavedCard}
                >
                  View <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              )}
            </div>
          )}

          <Separator />

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={loading || !hasToken}
            className="w-full bg-gradient-to-r from-[#6d5cff] to-[#a36bff] hover:from-[#5d4cef] hover:to-[#9358ef]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save to Pawkit'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
