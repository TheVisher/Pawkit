/**
 * Other Supertags
 * Simpler supertags without complex templates
 */

import type { SupertagDefinition } from './types';

export const meetingSupertag: SupertagDefinition = {
  tag: 'meeting',
  displayName: 'Meeting',
  icon: 'calendar',
  description: 'Meeting notes with attendees and action items',
  suggestedFields: ['date', 'attendees', 'agenda', 'actionItems'],
  uiHints: {
    showCheckboxes: true,
    calendarFields: ['date'],
  },
};

export const habitSupertag: SupertagDefinition = {
  tag: 'habit',
  displayName: 'Habit',
  icon: 'repeat',
  description: 'Habit to track daily',
  suggestedFields: ['frequency', 'streak'],
};

export const wishlistSupertag: SupertagDefinition = {
  tag: 'wishlist',
  displayName: 'Wishlist',
  icon: 'gift',
  description: 'Items you want to buy or receive',
  suggestedFields: ['price', 'priority', 'link'],
};

export const warrantySupertag: SupertagDefinition = {
  tag: 'warranty',
  displayName: 'Warranty',
  icon: 'shield',
  description: 'Product warranty or receipt for tracking',
  suggestedFields: ['purchaseDate', 'expiryDate', 'serialNumber', 'receiptUrl'],
  uiHints: {
    calendarFields: ['expiryDate'],
  },
};
