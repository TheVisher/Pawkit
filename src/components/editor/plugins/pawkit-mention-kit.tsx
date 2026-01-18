'use client';

/**
 * Pawkit Mention Kit
 *
 * Extended Plate mention plugin for Pawkit's 3 mention types:
 * - card: Links to another card (teal)
 * - pawkit: Links to a collection (purple)
 * - date: Links to a calendar date (blue)
 */

import { MentionInputPlugin, MentionPlugin } from '@platejs/mention/react';

import {
  PawkitMentionElement,
  PawkitMentionInputElement,
} from '@/components/ui/pawkit-mention-node';

export const PawkitMentionKit = [
  MentionPlugin.configure({
    options: {
      triggerPreviousCharPattern: /^$|^[\s"']$/,
    },
  }).withComponent(PawkitMentionElement),
  MentionInputPlugin.withComponent(PawkitMentionInputElement),
];
