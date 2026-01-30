/**
 * Content script for the /extension/connect page.
 * Listens for PAWKIT_EXTENSION_TOKEN messages from the page,
 * validates the token via background, and ACKs back.
 */

import browser from 'webextension-polyfill'
import type { ValidateTokenResponse } from '@/shared/types'

// Allowed origins for security
const ALLOWED_ORIGINS = [
  'https://getpawkit.com',
  'https://www.getpawkit.com',
  // Dev environment
  'http://localhost:5173',
  'http://localhost:3000',
]

window.addEventListener('message', async (event) => {
  // Security: Verify origin
  if (!ALLOWED_ORIGINS.includes(event.origin)) {
    return
  }

  // Security: Verify message comes from the window itself, not an iframe
  if (event.source !== window) {
    return
  }

  // Only handle our message type
  if (event.data?.type !== 'PAWKIT_EXTENSION_TOKEN') {
    return
  }

  const token = event.data.token
  if (!token || typeof token !== 'string') {
    // ACK back with failure
    window.postMessage(
      { type: 'PAWKIT_EXTENSION_CONNECTED', success: false },
      event.origin
    )
    return
  }

  try {
    // Validate and store via background service worker
    const result = await browser.runtime.sendMessage({
      type: 'VALIDATE_TOKEN',
      token,
    }) as ValidateTokenResponse

    // ACK back to page
    window.postMessage(
      { type: 'PAWKIT_EXTENSION_CONNECTED', success: result.ok },
      event.origin
    )
  } catch (error) {
    console.error('[extension-connect] Failed to validate token:', error)
    window.postMessage(
      { type: 'PAWKIT_EXTENSION_CONNECTED', success: false },
      event.origin
    )
  }
})

// Signal that the content script is ready
console.log('[Pawkit] Extension connect script loaded')
