/**
 * Settings Storage for Pawkit Mobile
 * Stores user preferences like pinned notes
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY_PREFIX = 'pawkit_settings_';

interface Settings {
  pinnedNoteIds: string[];
}

const DEFAULT_SETTINGS: Settings = {
  pinnedNoteIds: [],
};

let currentUserId: string | null = null;

/**
 * Initialize settings storage for a user
 */
export function initSettings(userId: string): void {
  currentUserId = userId;
  console.log('[Settings] Initialized for user:', userId);
}

/**
 * Get settings key for current user
 */
function getSettingsKey(): string {
  if (!currentUserId) {
    throw new Error('[Settings] Storage not initialized. Call initSettings() first.');
  }
  return `${SETTINGS_KEY_PREFIX}${currentUserId}`;
}

/**
 * Load all settings
 */
export async function loadSettings(): Promise<Settings> {
  try {
    const key = getSettingsKey();
    const data = await AsyncStorage.getItem(key);

    if (!data) {
      return DEFAULT_SETTINGS;
    }

    return JSON.parse(data);
  } catch (error) {
    console.error('[Settings] Error loading settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save all settings
 */
async function saveSettings(settings: Settings): Promise<void> {
  try {
    const key = getSettingsKey();
    await AsyncStorage.setItem(key, JSON.stringify(settings));
  } catch (error) {
    console.error('[Settings] Error saving settings:', error);
    throw error;
  }
}

/**
 * Get pinned note IDs
 */
export async function getPinnedNoteIds(): Promise<string[]> {
  const settings = await loadSettings();
  return settings.pinnedNoteIds;
}

/**
 * Pin a note
 */
export async function pinNote(noteId: string): Promise<void> {
  const settings = await loadSettings();

  if (!settings.pinnedNoteIds.includes(noteId)) {
    settings.pinnedNoteIds.push(noteId);
    await saveSettings(settings);
    console.log('[Settings] Pinned note:', noteId);
  }
}

/**
 * Unpin a note
 */
export async function unpinNote(noteId: string): Promise<void> {
  const settings = await loadSettings();

  settings.pinnedNoteIds = settings.pinnedNoteIds.filter(id => id !== noteId);
  await saveSettings(settings);
  console.log('[Settings] Unpinned note:', noteId);
}

/**
 * Check if a note is pinned
 */
export async function isNotePinned(noteId: string): Promise<boolean> {
  const pinnedIds = await getPinnedNoteIds();
  return pinnedIds.includes(noteId);
}

/**
 * Reorder pinned notes
 */
export async function reorderPinnedNotes(newOrder: string[]): Promise<void> {
  const settings = await loadSettings();
  settings.pinnedNoteIds = newOrder;
  await saveSettings(settings);
  console.log('[Settings] Reordered pinned notes');
}

/**
 * Clear all settings
 */
export async function clearSettings(): Promise<void> {
  try {
    const key = getSettingsKey();
    await AsyncStorage.removeItem(key);
    console.log('[Settings] Cleared all settings');
  } catch (error) {
    console.error('[Settings] Error clearing settings:', error);
    throw error;
  }
}
