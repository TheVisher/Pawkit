/**
 * Background service worker for Pawkit Web Clipper
 * Handles API requests, context menus, and message passing
 */

import browser from 'webextension-polyfill'
import { saveCard, setToken, getToken, getCollections } from './background/api'
import type { Message, SaveCardResponse, GetTokenResponse, GetCollectionsResponse } from './shared/types'

// Create context menu on install
browser.runtime.onInstalled.addListener(() => {
  // Save page or link
  browser.contextMenus.create({
    id: 'save-to-pawkit',
    title: 'Save page to Pawkit',
    contexts: ['page', 'link']
  })

  // Save image with page context
  browser.contextMenus.create({
    id: 'save-image-to-pawkit',
    title: 'Save image to Pawkit',
    contexts: ['image']
  })

  console.log('Pawkit Web Clipper installed')
})

// Handle context menu clicks
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return

  try {
    // Handle regular page/link saves
    if (info.menuItemId === 'save-to-pawkit') {
      const url = (info.linkUrl || info.pageUrl || tab.url) ?? ''
      const title = info.linkUrl
        ? new URL(info.linkUrl).hostname
        : (tab.title || 'Untitled')

      const response = await saveCard({
        title,
        url,
        source: 'webext'
      })

      showNotification(response, title)
    }

    // Handle image saves with page context
    else if (info.menuItemId === 'save-image-to-pawkit' && info.srcUrl) {
      // Use page URL as the main URL (for context)
      const pageUrl = tab.url || ''
      const imageUrl = info.srcUrl
      const title = tab.title || 'Untitled'

      const response = await saveCard({
        title,
        url: pageUrl, // Save page URL as the main link
        source: 'webext',
        notes: `Image URL: ${imageUrl}`, // Store image URL in notes
        meta: {
          ogImage: imageUrl // Use the image as the thumbnail
        }
      })

      showNotification(response, title)
    }
  } catch (error) {
    console.error('Context menu save failed:', error)
  }
})

// API response type for notification handling
interface ApiResponse {
  ok: boolean;
  error?: string;
}

// Helper to show notifications
function showNotification(response: ApiResponse, title: string) {
  if (response.ok) {
    browser.notifications?.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('icons/icon-48.png'),
      title: 'Saved to Pawkit',
      message: `"${title}" has been saved to your Pawkit`
    })
  } else {
    browser.notifications?.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('icons/icon-48.png'),
      title: 'Save Failed',
      message: response.error || 'Failed to save to Pawkit'
    })
  }
}

// Handle messages from popup/options pages
browser.runtime.onMessage.addListener(
  (message: Message & { type: string }, _sender): Promise<SaveCardResponse | GetTokenResponse | GetCollectionsResponse> | undefined => {
    // Handle REOPEN_POPUP - open the extension popup after image selection
    if (message.type === 'REOPEN_POPUP') {
      // Use browser.action.openPopup() if available (Firefox), otherwise show notification
      if (browser.action?.openPopup) {
        browser.action.openPopup().catch(() => {
          // Some browsers don't support programmatic popup opening
          // Show a notification instead
          browser.notifications?.create({
            type: 'basic',
            iconUrl: browser.runtime.getURL('icons/icon-48.png'),
            title: 'Thumbnail Selected',
            message: 'Click the Pawkit icon to save with your selected thumbnail'
          })
        })
      } else {
        // Show notification for browsers that don't support openPopup
        browser.notifications?.create({
          type: 'basic',
          iconUrl: browser.runtime.getURL('icons/icon-48.png'),
          title: 'Thumbnail Selected',
          message: 'Click the Pawkit icon to save with your selected thumbnail'
        })
      }
      return undefined
    }

    return new Promise(async (resolve) => {
      try {
        switch (message.type) {
          case 'SAVE_CARD': {
            const response = await saveCard(message.payload)

            // Page uses polling to auto-refresh, no need to notify

            resolve(response as SaveCardResponse)
            break
          }

          case 'SET_TOKEN': {
            await setToken(message.token)
            resolve({ ok: true })
            break
          }

          case 'GET_TOKEN': {
            const token = await getToken()
            resolve({ ok: true, token: token || undefined })
            break
          }

          case 'GET_COLLECTIONS': {
            const response = await getCollections()
            resolve(response as GetCollectionsResponse)
            break
          }

          default:
            resolve({ ok: false, error: 'Unknown message type' })
        }
      } catch (error) {
        console.error('Message handler error:', error)
        resolve({
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })
  }
)

console.log('Pawkit service worker running')
