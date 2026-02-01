import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { AddCardForm } from './add-card-form';
import { isPlateJson, parseJsonContent } from '@/lib/plate/html-to-plate';

const createCard = vi.fn().mockResolvedValue({ id: 'card-1' });
const openCardDetail = vi.fn();
const success = vi.fn();
const error = vi.fn();

vi.mock('@/lib/stores/data-store', () => ({
  useDataStore: (selector: (state: { createCard: typeof createCard }) => unknown) =>
    selector({ createCard }),
}));

vi.mock('@/lib/stores/workspace-store', () => ({
  useCurrentWorkspace: () => ({ _id: 'workspace-1', name: 'Test Workspace' }),
}));

vi.mock('@/lib/hooks/use-live-data', () => ({
  useCards: () => [],
  useCollections: () => [],
}));

vi.mock('@/lib/stores/toast-store', () => ({
  useToast: () => ({ success, error }),
}));

vi.mock('@/lib/stores/modal-store', () => ({
  useModalStore: () => ({ openCardDetail }),
}));

vi.mock('@/lib/contexts/convex-data-context', () => ({
  useMutations: () => ({ createCard }),
  useCards: () => [],
  useCollections: () => [],
}));

describe('AddCardForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves note content as Plate JSON', async () => {
    render(
      <AddCardForm
        defaultTab="note"
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Test Note' },
    });
    fireEvent.change(screen.getByLabelText('Content'), {
      target: { value: 'Line 1\nLine 2' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Note' }));

    await waitFor(() => expect(createCard).toHaveBeenCalledTimes(1));

    const payload = createCard.mock.calls[0][0] as { content?: unknown };

    // Content can be either an object (Plate JSON array) or a JSON string
    // The component now stores it as an object directly
    if (typeof payload.content === 'string') {
      expect(isPlateJson(payload.content)).toBe(true);
      const parsed = parseJsonContent(payload.content);
      expect(parsed).not.toBeNull();
      expect(parsed?.length).toBe(2);
    } else {
      // Content is already a Plate JSON array
      expect(Array.isArray(payload.content)).toBe(true);
      expect((payload.content as unknown[]).length).toBe(2);
    }
  });
});
