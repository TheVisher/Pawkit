/**
 * Extension configuration
 * Add your published extension IDs here for CORS validation
 */

// Allowed Chrome extension IDs
export const ALLOWED_CHROME_EXTENSIONS: string[] = [
  'bbmhcminlncbpkmblbaelhkamhmknjcj', // Pawkit Web Clipper - Chrome Web Store
];

// Allowed Firefox extension IDs
// Add your published Firefox extension ID here when you publish
export const ALLOWED_FIREFOX_EXTENSIONS: string[] = [
  // Firefox extension not yet published
  // Format: '{uuid}' or 'name@domain'
];

// In development AND when no specific extensions are configured, allow any extension origin
// This allows easier local development and supports self-hosted/private extensions
export const ALLOW_ANY_EXTENSION_IN_DEV = process.env.NODE_ENV === 'development';
export const ALLOW_ANY_EXTENSION_WHEN_EMPTY =
  ALLOWED_CHROME_EXTENSIONS.length === 0 && ALLOWED_FIREFOX_EXTENSIONS.length === 0;

/**
 * Validates if an origin is from an allowed browser extension
 */
export function isAllowedExtensionOrigin(origin: string): boolean {
  // In development, allow any extension for easier testing
  if (ALLOW_ANY_EXTENSION_IN_DEV) {
    return origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://');
  }

  // If no specific extensions are configured, allow all (useful for self-hosted/private use)
  if (ALLOW_ANY_EXTENSION_WHEN_EMPTY) {
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
