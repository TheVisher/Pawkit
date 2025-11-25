import { useState, useEffect } from 'react'
import browser from 'webextension-polyfill'
import { Loader2, Settings, ExternalLink, CheckCircle2, ImageIcon, X, ChevronDown, Library, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { SaveCardMessage, SaveCardResponse, Collection, GetCollectionsResponse } from '@/shared/types'

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
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedCollectionSlug, setSelectedCollectionSlug] = useState<string | null>(null)
  const [loadingCollections, setLoadingCollections] = useState(false)

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
        const tokenExists = !!response.token
        setHasToken(tokenExists)

        // Fetch collections if authenticated
        if (tokenExists) {
          setLoadingCollections(true)
          try {
            const collectionsResponse = await browser.runtime.sendMessage({ type: 'GET_COLLECTIONS' }) as GetCollectionsResponse
            if (collectionsResponse.ok && collectionsResponse.data) {
              setCollections(collectionsResponse.data)
            }
          } catch (err) {
            console.error('Failed to fetch collections:', err)
          } finally {
            setLoadingCollections(false)
          }
        }

        // Check for selected image from storage (set by content script)
        const storage = await browser.storage.local.get('selectedImage')
        if (storage.selectedImage) {
          console.log('[Popup] Found selected image in storage:', storage.selectedImage)
          setSelectedImage(storage.selectedImage)
          // Clear it from storage after loading
          await browser.storage.local.remove('selectedImage')
        }
      } catch (error) {
        console.error('Failed to initialize popup:', error)
      }
    }

    initializePopup()

    // Listen for storage changes (when content script saves selected image)
    const handleStorageChange = (changes: { [key: string]: browser.Storage.StorageChange }) => {
      if (changes.selectedImage?.newValue) {
        console.log('[Popup] Image selected via storage:', changes.selectedImage.newValue)
        setSelectedImage(changes.selectedImage.newValue)
        // Clear from storage
        browser.storage.local.remove('selectedImage')
      }
    }

    browser.storage.onChanged.addListener(handleStorageChange)
    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  const handleStartImagePicker = async () => {
    try {
      setError('')

      // Get current tab
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        setError('Cannot access current tab')
        return
      }

      // Send message to content script (auto-injected on all pages)
      await browser.tabs.sendMessage(tab.id, { type: 'START_IMAGE_PICKER' })

      // Close popup so user can interact with the page
      // When they select an image, the content script will store it and trigger popup reopen
      window.close()
    } catch (err) {
      console.error('Failed to start image picker:', err)
      // Content script may not be loaded on special pages (chrome://, about:, etc.)
      setError('Cannot pick image on this page (browser internal pages are not supported)')
    }
  }

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
          collections: selectedCollectionSlug ? [selectedCollectionSlug] : undefined,
          source: 'webext',
          meta: {
            favicon,
            ogImage: selectedImage || undefined
          }
        }
      }

      const response = await browser.runtime.sendMessage(message) as SaveCardResponse

      if (response.ok) {
        setSaved(true)
        setSavedCardId(response.data?.id || null)
        // Clear notes and image after successful save
        setNotes('')
        setSelectedImage(null)
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

  const openSavedCard = async () => {
    // Navigate to the collection the card was saved to, or library if none
    const targetPath = selectedCollectionSlug
      ? `/pawkits/${selectedCollectionSlug}`
      : '/library'
    const targetUrl = `https://getpawkit.com${targetPath}`

    // Find existing Pawkit tab
    const tabs = await browser.tabs.query({})
    const pawkitTab = tabs.find(tab =>
      tab.url?.includes('getpawkit.com')
    )

    if (pawkitTab?.id) {
      // Check if already on the target page
      const currentPath = pawkitTab.url ? new URL(pawkitTab.url).pathname : ''
      if (currentPath === targetPath) {
        // Already on the right page, just switch to it
        await browser.tabs.update(pawkitTab.id, { active: true })
      } else {
        // Navigate to the target collection
        await browser.tabs.update(pawkitTab.id, { active: true, url: targetUrl })
      }

      // Focus the window containing the tab
      if (pawkitTab.windowId) {
        await browser.windows.update(pawkitTab.windowId, { focused: true })
      }
    } else {
      // Open new tab to the target collection if none exists
      await browser.tabs.create({ url: targetUrl })
    }
  }

  return (
    <div className="w-96 max-h-[600px] overflow-y-auto">
      <Card className="border-0 rounded-none shadow-none">
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {favicon && <img src={favicon} alt="" className="w-4 h-4" />}
              <span className="text-xs text-muted-foreground truncate max-w-[280px]">
                {url ? new URL(url).hostname : ''}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
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

        <CardContent className="space-y-2 pt-0 pb-3">

          {/* Title */}
          <div className="space-y-1">
            <Label htmlFor="title" className="text-xs">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Page title"
              disabled={loading}
              className="h-8"
            />
          </div>

          {/* URL */}
          <div className="space-y-1">
            <Label htmlFor="url" className="text-xs">URL</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              disabled={loading}
              className="h-8"
            />
          </div>

          {/* Collection Selector */}
          <div className="space-y-1">
            <Label htmlFor="collection" className="text-xs">Save to</Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                {selectedCollectionSlug ? (
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Library className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <select
                id="collection"
                value={selectedCollectionSlug || ''}
                onChange={(e) => setSelectedCollectionSlug(e.target.value || null)}
                disabled={loading || loadingCollections}
                className="w-full h-8 pl-9 pr-8 rounded-md border border-input bg-background text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Library</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.slug}>
                    {collection.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              {loadingCollections && (
                <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Thumbnail Selection */}
          <div className="space-y-1">
            <Label className="text-xs">Thumbnail</Label>
            {selectedImage ? (
              <div className="flex items-center gap-2 p-1.5 bg-muted/50 rounded-md border border-border">
                <img
                  src={selectedImage}
                  alt="Selected thumbnail"
                  className="w-10 h-10 object-cover rounded border border-border flex-shrink-0"
                />
                <p className="text-xs text-muted-foreground flex-1 min-w-0 truncate">Selected</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={() => setSelectedImage(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartImagePicker}
                disabled={loading}
                className="w-full h-8"
              >
                <ImageIcon className="mr-2 h-3 w-3" />
                Select from Page
              </Button>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="notes" className="text-xs">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your notes..."
              className="min-h-[44px] resize-none text-sm"
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
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span>Saved!</span>
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
