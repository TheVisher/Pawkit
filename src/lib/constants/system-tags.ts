/**
 * System Tags Constants
 * Special tags that control privacy and sync behavior
 */

export const SYSTEM_TAGS = {
  PRIVATE: 'private',
  LOCAL_ONLY: 'local-only',
} as const;

export type SystemTag = typeof SYSTEM_TAGS[keyof typeof SYSTEM_TAGS];

/**
 * Check if a tag is a system tag
 */
export function isSystemTag(tag: string): tag is SystemTag {
  return Object.values(SYSTEM_TAGS).includes(tag as SystemTag);
}
