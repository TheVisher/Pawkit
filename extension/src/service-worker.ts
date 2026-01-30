/**
 * Background service worker for Pawkit Web Clipper
 * Handles API requests, context menus, and message passing
 *
 * V3.0: Uses extension token authentication
 */

import browser from 'webextension-polyfill'
import {
  saveCard,
  getCollections,
  checkAuth,
  clearSession,
  initiateLogin,
  validateAndStoreToken,
} from './background/api'
import type { Message, SaveCardResponse, GetCollectionsResponse, CheckAuthResponse, ValidateTokenResponse } from './shared/types'

// =============================================================================
// CONTEXT MENU SETUP
// =============================================================================

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

  console.log('[Service Worker] Pawkit Web Clipper installed')
})

// =============================================================================
// CONTEXT MENU HANDLERS
// =============================================================================

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
        url: pageUrl,
        source: 'webext',
        notes: `Image URL: ${imageUrl}`,
        meta: {
          ogImage: imageUrl
        }
      })

      showNotification(response, title)
    }
  } catch (error) {
    console.error('[Service Worker] Context menu save failed:', error)
  }
})

// =============================================================================
// NOTIFICATION HELPER
// =============================================================================

interface ApiResponse {
  ok: boolean;
  error?: string;
}

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

// =============================================================================
// MESSAGE HANDLERS
// =============================================================================

// Handle messages from popup/options/content scripts
browser.runtime.onMessage.addListener(
  (message: Message & { type: string; token?: string }, _sender): Promise<SaveCardResponse | GetCollectionsResponse | CheckAuthResponse | ValidateTokenResponse | { ok: boolean }> | undefined => {

    // Handle VALIDATE_TOKEN - validate and store extension token
    if (message.type === 'VALIDATE_TOKEN' && message.token) {
      return validateAndStoreToken(message.token).then((result) => {
        console.log('[Service Worker] Token validation result:', result.ok)
        return result
      })
    }

    // Handle REOPEN_POPUP - open the extension popup after image selection
    if (message.type === 'REOPEN_POPUP') {
      if (browser.action?.openPopup) {
        browser.action.openPopup().catch(() => {
          browser.notifications?.create({
            type: 'basic',
            iconUrl: browser.runtime.getURL('icons/icon-48.png'),
            title: 'Thumbnail Selected',
            message: 'Click the Pawkit icon to save with your selected thumbnail'
          })
        })
      } else {
        browser.notifications?.create({
          type: 'basic',
          iconUrl: browser.runtime.getURL('icons/icon-48.png'),
          title: 'Thumbnail Selected',
          message: 'Click the Pawkit icon to save with your selected thumbnail'
        })
      }
      return undefined
    }

    // Handle INITIATE_LOGIN - open Pawkit tab for login
    if (message.type === 'INITIATE_LOGIN') {
      return initiateLogin().then(() => ({ ok: true }))
    }

    // Handle LOGOUT - clear stored session
    if (message.type === 'LOGOUT') {
      return clearSession().then(() => ({ ok: true }))
    }

    return new Promise(async (resolve) => {
      try {
        switch (message.type) {
          case 'SAVE_CARD': {
            const response = await saveCard((message as Message & { type: 'SAVE_CARD' }).payload)
            resolve(response as SaveCardResponse)
            break
          }

          case 'CHECK_AUTH': {
            const response = await checkAuth()
            resolve(response as CheckAuthResponse)
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
        console.error('[Service Worker] Message handler error:', error)
        resolve({
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })
  }
)

console.log('[Service Worker] Pawkit service worker running')
