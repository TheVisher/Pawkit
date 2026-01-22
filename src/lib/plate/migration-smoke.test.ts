import { describe, it, expect } from 'vitest';
import type { Value } from 'platejs';
import { format } from 'date-fns';

import {
  serializePlateContent,
  parseJsonContent,
  isPlateJson,
  htmlToPlateJson,
  extractPlateText,
} from '@/lib/plate/html-to-plate';
import { parseTaskItemsFromCard } from '@/lib/utils/parse-task-items';
import { parseSubscriptionInfo } from '@/lib/utils/parse-subscription-info';
import { htmlToMarkdown } from '@/lib/utils/markdown-export';
import type { Card } from '@/lib/types/convex';

describe('Plate JSON migration smoke checks', () => {
  it('serializes Plate JSON and detects it correctly', () => {
    const content = serializePlateContent([
      { type: 'p', children: [{ text: 'Hello Plate' }] },
    ] as Value);

    expect(isPlateJson(content)).toBe(true);
    expect(parseJsonContent(content)).toMatchObject([
      { type: 'p', children: [{ text: 'Hello Plate' }] },
    ]);
  });

  it('preserves legacy HTML when prepending daily-log entries', () => {
    const existingHtml = '<p><strong>8:00 AM</strong> - Old entry</p>';
    const entryNodes = [
      {
        type: 'p',
        children: [
          { text: '9:00 AM', bold: true },
          { text: ' - New entry' },
        ],
      },
    ];

    const merged = serializePlateContent([
      ...entryNodes,
      ...htmlToPlateJson(existingHtml),
    ] as Value);

    const parsed = parseJsonContent(merged);
    expect(parsed).not.toBeNull();
    expect(extractPlateText(parsed as Value)).toContain('New entry');
    expect(extractPlateText(parsed as Value)).toContain('Old entry');
  });

  it('parses todo tasks from Plate JSON content', () => {
    const today = format(new Date(), 'MMMM d, yyyy');
    const content = serializePlateContent([
      { type: 'h2', children: [{ text: today }] },
      { type: 'action_item', checked: false, children: [{ text: 'Buy milk' }] },
    ] as Value);

    const card = {
      _id: 'card-1',
      title: 'Todos',
      tags: ['todo'],
      content,
    } as unknown as Card;

    const tasks = parseTaskItemsFromCard(card);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].text).toBe('Buy milk');
    expect(tasks[0].checked).toBe(false);
    expect(tasks[0].dateHeader).toBe(today);
  });

  it('parses subscription info from Plate JSON content', () => {
    const content = serializePlateContent([
      { type: 'p', children: [{ text: 'Amount: $12.99' }] },
      { type: 'p', children: [{ text: 'Renews: 15' }] },
    ] as Value);

    const card = {
      _id: 'card-2',
      title: 'Netflix',
      tags: ['subscription'],
      content,
    } as unknown as Card;

    const info = parseSubscriptionInfo(card);
    expect(info).not.toBeNull();
    expect(info?.amount).toBe(12.99);
    expect(info?.renewalDay).toBe(15);
  });

  it('exports Plate JSON to markdown with mentions, callouts, and tasks', () => {
    const content = serializePlateContent([
      {
        type: 'callout',
        variant: 'info',
        children: [{ type: 'p', children: [{ text: 'Heads up' }] }],
      },
      {
        type: 'mention',
        value: 'My Card',
        mentionType: 'card',
        children: [{ text: '' }],
      },
      { type: 'action_item', checked: true, children: [{ text: 'Ship it' }] },
    ] as Value);

    const markdown = htmlToMarkdown(content);
    expect(markdown).toContain('> [!info]');
    expect(markdown).toContain('[[My Card]]');
    expect(markdown).toContain('- [x] Ship it');
  });
});
