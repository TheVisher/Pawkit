import { useEffect, useState } from 'react';
import { useShareIntent } from 'expo-share-intent';
import { Snackbar } from 'react-native-paper';
import { cardsApi } from '../api/client';

/**
 * ShareHandler component - Handles incoming share intents from iOS Share Extension
 *
 * When a user shares a URL from Safari, TikTok, Reddit, or any other app:
 * 1. iOS Share Sheet shows "Pawkit" option
 * 2. expo-share-intent captures the URL
 * 3. This component receives it via useShareIntent hook
 * 4. Creates a bookmark automatically
 * 5. Shows success/error notification
 */
export function ShareHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    // Only process if we have a share intent with a URL
    if (!hasShareIntent || !shareIntent?.webUrl) {
      return;
    }

    // Handle the share intent
    handleShareIntent();
  }, [hasShareIntent, shareIntent]);

  const handleShareIntent = async () => {
    try {
      console.log('[ShareHandler] Processing share intent:', shareIntent);

      // Extract URL from share intent
      const url = shareIntent.webUrl;

      if (!url) {
        throw new Error('No URL found in share intent');
      }

      // Create bookmark with shared URL
      await cardsApi.create({
        type: 'url',
        url: url,
        title: shareIntent.text || undefined, // Use shared text as title if available
      });

      // Show success notification
      showNotification('Bookmark saved!', 'success');

      console.log('[ShareHandler] Successfully created bookmark for:', url);
    } catch (error: any) {
      console.error('[ShareHandler] Failed to create bookmark:', error);

      // Show error notification
      const errorMessage = error?.message || 'Failed to save bookmark';
      showNotification(errorMessage, 'error');
    } finally {
      // Always reset the share intent so it doesn't process again
      resetShareIntent();
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);
  };

  const hideNotification = () => {
    setSnackbarVisible(false);
  };

  return (
    <Snackbar
      visible={snackbarVisible}
      onDismiss={hideNotification}
      duration={3000}
      style={{
        backgroundColor: snackbarType === 'success' ? '#4CAF50' : '#F44336',
      }}
    >
      {snackbarMessage}
    </Snackbar>
  );
}
