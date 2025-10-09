/**
 * Extension configuration
 * Add your published extension IDs here for CORS validation
 */

// Allowed Chrome extension IDs
// Add your published Chrome extension ID here when you publish
export const ALLOWED_CHROME_EXTENSIONS: string[] = [
  // Example: 'abcdefghijklmnopqrstuvwxyz123456'
];

// Allowed Firefox extension IDs
// Add your published Firefox extension ID here when you publish
export const ALLOWED_FIREFOX_EXTENSIONS: string[] = [
  // Example: '{12345678-1234-1234-1234-123456789012}'
];

// In development, allow any extension origin
export const ALLOW_ANY_EXTENSION_IN_DEV = process.env.NODE_ENV === 'development';

/**
 * Validates if an origin is from an allowed browser extension
 */
export function isAllowedExtensionOrigin(origin: string): boolean {
  // In development, allow any extension for easier testing
  if (ALLOW_ANY_EXTENSION_IN_DEV) {
    return origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://');
  }

  // Chrome extension
  if (origin.startsWith('chrome-extension://')) {
    const extensionId = origin.replace('chrome-extension://', '').split('/')[0];
    return ALLOWED_CHROME_EXTENSIONS.includes(extensionId);
  }

  // Firefox extension
  if (origin.startsWith('moz-extension://')) {
    const extensionId = origin.replace('moz-extension://', '').split('/')[0];
    return ALLOWED_FIREFOX_EXTENSIONS.includes(extensionId);
  }

  return false;
}
