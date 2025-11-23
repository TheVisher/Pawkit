/**
 * Utility functions for the mobile app
 */

/**
 * Safely extract the hostname from a URL
 * @param value - URL string (can be with or without http/https)
 * @returns hostname (e.g., "www.example.com") or undefined if invalid
 */
export function safeHost(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return url.hostname;
  } catch (error) {
    return undefined;
  }
}

/**
 * Detect if input is probably a URL (matches web app logic)
 * @param input - User input string
 * @returns true if input looks like a URL
 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

export function isProbablyUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (/\s/.test(trimmed)) return false; // No whitespace allowed

  const candidate = trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    const host = url.hostname.toLowerCase();
    if (!host) return false;
    if (LOCAL_HOSTS.has(host)) return true;
    return host.includes("."); // Must have a dot (domain.tld)
  } catch {
    return false;
  }
}
