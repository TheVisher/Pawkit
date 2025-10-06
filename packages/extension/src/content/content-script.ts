// Content script that runs in the context of pawkit.vercel.app pages
// This can communicate with the page's BroadcastChannel

import browser from 'webextension-polyfill';

console.log('[Pawkit Extension] Content script loaded on:', window.location.href);

// Listen for messages from the extension background script
browser.runtime.onMessage.addListener((message) => {
  console.log('[Pawkit Extension] Content script received message:', message);

  if (message.type === 'CARD_CREATED') {
    // Use BroadcastChannel to notify the page
    try {
      console.log('[Pawkit Extension] Creating BroadcastChannel...');
      const channel = new BroadcastChannel('pawkit-extension');
      console.log('[Pawkit Extension] Posting message to channel:', { type: 'CARD_CREATED', cardId: message.cardId });
      channel.postMessage({ type: 'CARD_CREATED', cardId: message.cardId });
      channel.close();
      console.log('[Pawkit Extension] Successfully broadcasted CARD_CREATED event to page');
    } catch (e) {
      console.error('[Pawkit Extension] Failed to broadcast:', e);
    }
  }

  return true; // Keep the message channel open for async response
});
