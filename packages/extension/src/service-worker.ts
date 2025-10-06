/**
 * Background service worker for Pawkit Web Clipper
 * Handles API requests, context menus, and message passing
 */

import browser from 'webextension-polyfill'
import { saveCard, setToken, getToken } from './background/api'
import type { Message, SaveCardResponse, GetTokenResponse } from './shared/types'

// Create context menu on install
browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: 'save-to-pawkit',
    title: 'Save page to Pawkit',
    contexts: ['page', 'link']
  })

  console.log('Pawkit Web Clipper installed')
})

// Handle context menu clicks
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'save-to-pawkit' && tab?.id) {
    try {
      // Determine URL and title based on context
      const url = (info.linkUrl || info.pageUrl || tab.url) ?? ''
      const title = info.linkUrl
        ? new URL(info.linkUrl).hostname
        : (tab.title || 'Untitled')

      const response = await saveCard({
        title,
        url,
        source: 'webext'
      })

      if (response.ok) {
        // Show success notification
        browser.notifications?.create({
          type: 'basic',
          iconUrl: browser.runtime.getURL('icons/icon-48.png'),
          title: 'Saved to Pawkit',
          message: `"${title}" has been saved to your Pawkit`
        })
      } else {
        // Show error notification
        browser.notifications?.create({
          type: 'basic',
          iconUrl: browser.runtime.getURL('icons/icon-48.png'),
          title: 'Save Failed',
          message: response.error || 'Failed to save to Pawkit'
        })
      }
    } catch (error) {
      console.error('Context menu save failed:', error)
    }
  }
})

// Handle messages from popup/options pages
browser.runtime.onMessage.addListener(
  (message: Message, _sender): Promise<SaveCardResponse | GetTokenResponse> => {
    return new Promise(async (resolve) => {
      try {
        switch (message.type) {
          case 'SAVE_CARD': {
            const response = await saveCard(message.payload)

            // If save was successful, notify content scripts to trigger page refresh
            if (response.ok && response.data?.id) {
              // Send message to all tabs on pawkit.vercel.app
              browser.tabs.query({ url: 'https://pawkit.vercel.app/*' }).then(tabs => {
                tabs.forEach(tab => {
                  if (tab.id) {
                    browser.tabs.sendMessage(tab.id, {
                      type: 'CARD_CREATED',
                      cardId: response.data.id
                    }).catch(() => {
                      // Content script might not be loaded yet, that's ok
                    })
                  }
                })
              })
            }

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
