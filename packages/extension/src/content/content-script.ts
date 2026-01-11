/**
 * Content script for Pawkit Web Clipper
 * Handles image picker functionality for selecting thumbnails from the page
 */

import browser from 'webextension-polyfill'

// Track picker state
let isPickerActive = false
let overlay: HTMLDivElement | null = null
let instructionTooltip: HTMLDivElement | null = null
let cleanupFunctions: (() => void)[] = []

// Listen for messages from popup/background
browser.runtime.onMessage.addListener((message, _sender) => {
  if (message.type === 'START_IMAGE_PICKER') {
    startImagePicker()
    return Promise.resolve({ ok: true })
  }
  if (message.type === 'CLEAR_SELECTED_IMAGE') {
    // Clear storage when popup clears the image
    browser.storage.local.remove('selectedImage')
    return Promise.resolve({ ok: true })
  }
  return undefined
})

function startImagePicker() {
  if (isPickerActive) return
  isPickerActive = true


  // Add global styles for image highlighting
  const styleEl = document.createElement('style')
  styleEl.id = 'pawkit-picker-styles'
  styleEl.textContent = `
    .pawkit-image-highlight {
      outline: 4px solid #6d5cff !important;
      outline-offset: 2px !important;
      cursor: pointer !important;
      filter: brightness(1.1) !important;
    }
    .pawkit-image-selectable {
      cursor: pointer !important;
      transition: outline 0.15s ease, filter 0.15s ease !important;
    }
  `
  document.head.appendChild(styleEl)
  cleanupFunctions.push(() => styleEl.remove())

  // Create overlay - but make it NOT block clicks (we'll handle clicks on images directly)
  overlay = document.createElement('div')
  overlay.id = 'pawkit-image-picker-overlay'
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    z-index: 2147483600;
    pointer-events: auto;
  `
  document.body.appendChild(overlay)

  // Click on overlay cancels
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      cleanup()
    }
  })

  // Create instruction tooltip
  instructionTooltip = document.createElement('div')
  instructionTooltip.id = 'pawkit-picker-tooltip'
  instructionTooltip.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
      <span>Click an image to select as thumbnail</span>
    </div>
    <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;">Press ESC to cancel</div>
  `
  instructionTooltip.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #6d5cff, #a36bff);
    color: white;
    padding: 12px 20px;
    border-radius: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 2147483647;
    box-shadow: 0 4px 20px rgba(109, 92, 255, 0.4);
    pointer-events: none;
  `
  document.body.appendChild(instructionTooltip)

  // Find all images and create clickable overlays for them
  const images = document.querySelectorAll('img')

  let selectableCount = 0
  images.forEach((img) => {
    // Skip tiny images (icons, spacers)
    const rect = img.getBoundingClientRect()
    if (rect.width < 50 || rect.height < 50) return

    selectableCount++

    // Create a clickable overlay positioned exactly over the image
    const clickOverlay = document.createElement('div')
    clickOverlay.className = 'pawkit-click-overlay'
    clickOverlay.style.cssText = `
      position: fixed;
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      z-index: 2147483646;
      cursor: pointer;
      border: 3px solid transparent;
      border-radius: 4px;
      transition: border-color 0.15s ease, background 0.15s ease;
      box-sizing: border-box;
    `
    document.body.appendChild(clickOverlay)

    clickOverlay.addEventListener('mouseenter', () => {
      clickOverlay.style.borderColor = '#6d5cff'
      clickOverlay.style.background = 'rgba(109, 92, 255, 0.2)'
    })

    clickOverlay.addEventListener('mouseleave', () => {
      clickOverlay.style.borderColor = 'transparent'
      clickOverlay.style.background = 'transparent'
    })

    clickOverlay.addEventListener('click', async (e) => {
      e.preventDefault()
      e.stopPropagation()

      // Get best image URL
      let imageUrl = img.src

      // Check for srcset (get highest resolution)
      if (img.srcset) {
        const srcsetParts = img.srcset.split(',')
        const lastPart = srcsetParts[srcsetParts.length - 1].trim()
        const srcUrl = lastPart.split(' ')[0]
        if (srcUrl) imageUrl = srcUrl
      }

      // Check for data-src (lazy loading)
      const dataSrc = img.getAttribute('data-src') || img.getAttribute('data-lazy-src')
      if (dataSrc && dataSrc.startsWith('http')) {
        imageUrl = dataSrc
      }

      // Resolve relative URLs
      if (!imageUrl.startsWith('http')) {
        imageUrl = new URL(imageUrl, window.location.href).href
      }

      // Store in local storage for popup to read
      await browser.storage.local.set({ selectedImage: imageUrl })

      // Cleanup the picker overlay
      cleanup()

      // Tell background script to reopen the popup
      browser.runtime.sendMessage({ type: 'REOPEN_POPUP' })
    })

    cleanupFunctions.push(() => clickOverlay.remove())
  })

  // Handle ESC key
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      cleanup()
    }
  }
  document.addEventListener('keydown', handleKeyDown)
  cleanupFunctions.push(() => document.removeEventListener('keydown', handleKeyDown))
}


function cleanup() {
  isPickerActive = false

  // Run all cleanup functions
  cleanupFunctions.forEach(fn => fn())
  cleanupFunctions = []

  // Remove overlay
  if (overlay) {
    overlay.remove()
    overlay = null
  }

  // Remove tooltip
  if (instructionTooltip) {
    instructionTooltip.remove()
    instructionTooltip = null
  }
}

