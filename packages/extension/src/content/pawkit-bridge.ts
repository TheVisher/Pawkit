/**
 * Content script that runs on getpawkit.com
 *
 * V2.1: Automatically grabs session tokens and sends to extension
 *
 * This script runs in the page context where cookies are available.
 * It calls /api/auth/extension to get the session tokens and sends
 * them to the background script for storage.
 *
 * The extension can then make direct API calls without needing this bridge.
 */

import browser from 'webextension-polyfill'

const API_BASE = 'https://www.getpawkit.com/api'

/**
 * Fetch session tokens and send to extension
 */
async function syncSession(): Promise<void> {
  try {
    // Call the auth endpoint (cookies will be sent automatically in this context)
    const response = await fetch(`${API_BASE}/auth/extension`, {
      method: 'GET',
      credentials: 'include',
    })

    if (!response.ok) {
      if (response.status === 401) {
        // User not logged in - notify extension to clear any stored session
        await browser.runtime.sendMessage({
          type: 'SESSION_UPDATE',
          authenticated: false,
        })
        console.log('[Pawkit Bridge] User not authenticated')
        return
      }
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.authenticated && data.session) {
      // Send session to background script for storage
      await browser.runtime.sendMessage({
        type: 'SESSION_UPDATE',
        authenticated: true,
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          user: data.session.user,
        },
      })
      console.log('[Pawkit Bridge] Session synced successfully')
    } else {
      await browser.runtime.sendMessage({
        type: 'SESSION_UPDATE',
        authenticated: false,
      })
      console.log('[Pawkit Bridge] No valid session found')
    }
  } catch (error) {
    console.error('[Pawkit Bridge] Failed to sync session:', error)
  }
}

/**
 * Handle messages from extension (for manual session refresh)
 */
browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'SYNC_SESSION') {
    // Manually triggered session sync
    return syncSession().then(() => ({ ok: true }))
  }
  return undefined
})

// Sync session on page load
// Use a small delay to ensure page is fully loaded
setTimeout(() => {
  syncSession()
}, 500)

// Also sync when the page becomes visible (tab activated)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    syncSession()
  }
})

console.log('[Pawkit Bridge] Content script loaded')
