// Content script that runs in the context of pawkit.vercel.app pages
// This can communicate with the page's BroadcastChannel

import browser from 'webextension-polyfill';

console.log('[Pawkit Extension] Content script loaded');

// Listen for messages from the extension background script
browser.runtime.onMessage.addListener((message) => {
  console.log('[Pawkit Extension] Content script received message:', message);

  if (message.type === 'CARD_CREATED') {
    // Use BroadcastChannel to notify the page
    try {
      const channel = new BroadcastChannel('pawkit-extension');
      channel.postMessage({ type: 'CARD_CREATED', cardId: message.cardId });
      channel.close();
      console.log('[Pawkit Extension] Broadcasted CARD_CREATED event to page');
    } catch (e) {
      console.error('[Pawkit Extension] Failed to broadcast:', e);
    }
  }
});
