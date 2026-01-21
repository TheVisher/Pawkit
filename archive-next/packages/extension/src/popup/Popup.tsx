import { useState, useEffect } from 'react'
import browser from 'webextension-polyfill'
import { Loader2, Settings, ExternalLink, CheckCircle2, ImageIcon, X, ChevronDown, Library, FolderOpen, LogIn, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { SaveCardMessage, SaveCardResponse, Collection, GetCollectionsResponse, CheckAuthResponse } from '@/shared/types'

/**
 * Check if the URL is a TikTok feed page where we need to extract the video URL
 * Feed pages like /foryou, /following don't have the video ID in the URL
 */
function isTikTokFeedPage(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.includes('tiktok.com')) return false

    // These are feed pages that don't contain the video ID
    const feedPaths = ['/foryou', '/following', '/explore', '/live']
    const pathname = parsed.pathname.toLowerCase()

    // Check if it's a feed page
    if (feedPaths.some(path => pathname === path || pathname.startsWith(path + '?') || pathname.startsWith(path + '/'))) {
      return true
    }

    // Also handle the root page which shows the For You feed
    if (pathname === '/' || pathname === '') {
      return true
    }

    // Check if it's NOT a direct video link (which already has the correct URL)
    // Direct video links have the pattern /@username/video/videoId
    if (pathname.includes('/video/')) {
      return false
    }

    // User profile pages showing videos should also extract the specific video URL
    // These are like /@username without /video/
    if (pathname.match(/^\/@[\w.-]+\/?$/)) {
      return true
    }

    return false
  } catch {
    return false
  }
}

export function Popup() {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [favicon, setFavicon] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [savedCardId, setSavedCardId] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedCollectionSlug, setSelectedCollectionSlug] = useState<string | null>(null)
  const [loadingCollections, setLoadingCollections] = useState(false)

  useEffect(() => {
    const initializePopup = async () => {
      try {
        // Get current tab info
        const [tab] = await browser.tabs.query({
          active: true,
          currentWindow: true
        })

        if (tab) {
          let pageTitle = tab.title || ''
          let pageUrl = tab.url || ''

          // Check if we're on TikTok - need to extract the actual video URL
          if (tab.url && tab.id && isTikTokFeedPage(tab.url)) {
            try {
              const response = await browser.tabs.sendMessage(tab.id, { type: 'GET_TIKTOK_VIDEO_URL' }) as { url: string | null; title: string | null }
              if (response?.url) {
                pageUrl = response.url
                // Use extracted title if available, otherwise fall back to tab title
                if (response.title) {
                  pageTitle = response.title
                }
              }
            } catch (err) {
              console.warn('Failed to get TikTok video URL:', err)
              // Fall back to page URL
            }
          }

          setTitle(pageTitle)
          setUrl(pageUrl)

          if (pageUrl) {
            const domain = new URL(pageUrl).hostname
            setFavicon(`https://www.google.com/s2/favicons?domain=${domain}&sz=32`)
          }
        }

        // Check if user is authenticated
        setCheckingAuth(true)
        const authResponse = await browser.runtime.sendMessage({ type: 'CHECK_AUTH' }) as CheckAuthResponse
        const authenticated = authResponse.ok === true
        setIsAuthenticated(authenticated)
        if (authResponse.user?.email) {
          setUserEmail(authResponse.user.email)
        }

        // Fetch collections if authenticated
        if (authenticated) {
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

        // Check for selected image from storage
        const storage = await browser.storage.local.get('selectedImage')
        if (storage.selectedImage) {
          setSelectedImage(storage.selectedImage)
          await browser.storage.local.remove('selectedImage')
        }
      } catch (error) {
        console.error('Failed to initialize popup:', error)
      } finally {
        setCheckingAuth(false)
      }
    }

    initializePopup()

    // Listen for storage changes
    const handleStorageChange = (changes: { [key: string]: browser.Storage.StorageChange }) => {
      if (changes.selectedImage?.newValue) {
        setSelectedImage(changes.selectedImage.newValue)
        browser.storage.local.remove('selectedImage')
      }
      // Re-check auth when session changes
      if (changes.pawkit_session) {
        browser.runtime.sendMessage({ type: 'CHECK_AUTH' }).then((response: CheckAuthResponse) => {
          setIsAuthenticated(response.ok === true)
          if (response.user?.email) {
            setUserEmail(response.user.email)
          }
        })
      }
    }

    browser.storage.onChanged.addListener(handleStorageChange)
    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  const handleLogin = async () => {
    try {
      await browser.runtime.sendMessage({ type: 'INITIATE_LOGIN' })
      // Close popup - user will login in the opened tab
      window.close()
    } catch (err) {
      console.error('Failed to initiate login:', err)
      setError('Failed to open login page')
    }
  }

  const handleLogout = async () => {
    try {
      await browser.runtime.sendMessage({ type: 'LOGOUT' })
      setIsAuthenticated(false)
      setUserEmail(null)
      setCollections([])
    } catch (err) {
      console.error('Failed to logout:', err)
    }
  }

  const handleStartImagePicker = async () => {
    try {
      setError('')

      const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        setError('Cannot access current tab')
        return
      }

      await browser.tabs.sendMessage(tab.id, { type: 'START_IMAGE_PICKER' })
      window.close()
    } catch (err) {
      console.error('Failed to start image picker:', err)
      setError('Cannot pick image on this page (browser internal pages are not supported)')
    }
  }

  const handleSave = async () => {
    if (!title.trim() || !url.trim()) {
      setError('Title and URL are required')
      return
    }

    if (!isAuthenticated) {
      setError('Please log in first')
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
          tags: selectedCollectionSlug ? [selectedCollectionSlug] : undefined,
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
        setSavedCardId(response.data?.card?.id || null)
        setNotes('')
        setSelectedImage(null)
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
    const targetPath = selectedCollectionSlug
      ? `/pawkits/${selectedCollectionSlug}`
      : '/library'
    const targetUrl = `https://getpawkit.com${targetPath}`

    const tabs = await browser.tabs.query({})
    const pawkitTab = tabs.find(tab => tab.url?.includes('getpawkit.com'))

    if (pawkitTab?.id) {
      const currentPath = pawkitTab.url ? new URL(pawkitTab.url).pathname : ''
      if (currentPath === targetPath) {
        await browser.tabs.update(pawkitTab.id, { active: true })
      } else {
        await browser.tabs.update(pawkitTab.id, { active: true, url: targetUrl })
      }

      if (pawkitTab.windowId) {
        await browser.windows.update(pawkitTab.windowId, { focused: true })
      }
    } else {
      await browser.tabs.create({ url: targetUrl })
    }
  }

  // Show loading state while checking auth
  if (checkingAuth) {
    return (
      <div className="w-96 h-32 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="w-96">
        <Card className="border-0 rounded-none shadow-none">
          <CardHeader className="pb-2 pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={browser.runtime.getURL('icons/icon-48.png')} alt="Pawkit" className="w-5 h-5" />
                <span className="font-medium">Pawkit Web Clipper</span>
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
          </CardHeader>

          <CardContent className="space-y-4 pb-4">
            <div className="text-center py-4">
              <div className="text-muted-foreground text-sm mb-4">
                Log in to Pawkit to start saving pages, articles, and links.
              </div>
              <Button
                onClick={handleLogin}
                className="w-full bg-gradient-to-r from-[#6d5cff] to-[#a36bff] hover:from-[#5d4cef] hover:to-[#9358ef]"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Log in to Pawkit
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              You'll be redirected to getpawkit.com to log in.
              Once logged in, return here to save content.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-96 max-h-[600px] overflow-y-auto">
      <Card className="border-0 rounded-none shadow-none">
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {favicon && <img src={favicon} alt="" className="w-4 h-4" />}
              <span className="text-xs text-muted-foreground truncate max-w-[240px]">
                {url ? new URL(url).hostname : ''}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {userEmail && (
                <span className="text-xs text-muted-foreground truncate max-w-[100px]" title={userEmail}>
                  {userEmail}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleLogout}
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
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
          </div>
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
            disabled={loading}
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
