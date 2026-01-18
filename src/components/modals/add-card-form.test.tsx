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
  useCurrentWorkspace: () => ({ id: 'workspace-1' }),
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

    const payload = createCard.mock.calls[0][0] as { content?: string };
    expect(payload.content).toBeTypeOf('string');
    expect(isPlateJson(payload.content)).toBe(true);

    const parsed = parseJsonContent(payload.content as string);
    expect(parsed).not.toBeNull();
    expect(parsed?.length).toBe(2);
  });
});
