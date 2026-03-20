import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddFoodModal from './AddFoodModal';

// ── Mock data ────────────────────────────────────────────────────────────────

const mockFoods = [
  {
    id: 'f1',
    name: 'Chicken Breast',
    emoji: '🍗',
    category: 'favorites',
    servingLabel: '100g',
    servingGrams: null,
    calories: '165',
    protein: '31',
    fat: '3.6',
    carbs: '0',
  },
  {
    id: 'f2',
    name: 'Brown Rice',
    emoji: '🍚',
    category: 'favorites',
    servingLabel: '1 cup',
    servingGrams: null,
    calories: '216',
    protein: '5',
    fat: '1.8',
    carbs: '45',
  },
];

const mockCounts: Record<string, number> = { favorites: 2, daily: 0 };
const emptyCounts: Record<string, number> = { favorites: 0, daily: 0 };

// ── Setup ────────────────────────────────────────────────────────────────────

function mockFetch(foods: typeof mockFoods, counts: Record<string, number>) {
  return vi.fn().mockImplementation((url: string) => {
    if (typeof url === 'string' && url.includes('/foods/counts')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(counts) });
    }
    if (typeof url === 'string' && url.includes('/foods')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(foods) });
    }
    if (typeof url === 'string' && url.includes('/log/batch')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch(mockFoods, mockCounts));
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const defaultProps = {
  open: true,
  hour: 12,
  date: '2025-06-15',
  onClose: vi.fn(),
  onAdded: vi.fn(),
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AddFoodModal', () => {
  it('renders nothing when not open', () => {
    const { container } = render(<AddFoodModal {...defaultProps} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal title and selects correct time block', () => {
    render(<AddFoodModal {...defaultProps} hour={12} />);
    expect(screen.getByText('Add Food')).toBeInTheDocument();
    // hour=12 → midday block should be active
    expect(screen.getByText('Midday').closest('button')).toHaveClass('timeBlockActive');
  });

  it('renders search input', () => {
    render(<AddFoodModal {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search foods...')).toBeInTheDocument();
  });

  it('renders accordion cards for categories', async () => {
    render(<AddFoodModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });
    expect(screen.getByText('Daily')).toBeInTheDocument();
  });

  it('displays food list from API in expanded card', async () => {
    render(<AddFoodModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
    });
    expect(screen.getByText('Brown Rice')).toBeInTheDocument();
  });

  it('shows food serving info', async () => {
    render(<AddFoodModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/100g/)).toBeInTheDocument();
    });
  });

  it('shows "No foods" when expanded card is empty', async () => {
    vi.stubGlobal('fetch', mockFetch([], emptyCounts));

    render(<AddFoodModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('No foods')).toBeInTheDocument();
    });
  });

  it('shows Select All button when card has foods', async () => {
    render(<AddFoodModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Select All')).toBeInTheDocument();
    });
  });

  it('clicking a food toggles selection (shows checkmark)', async () => {
    const user = userEvent.setup();
    render(<AddFoodModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
    });

    // Click to select
    await user.click(screen.getByText('Chicken Breast'));

    // Should show a checkmark and Save button
    expect(screen.getByText('✓')).toBeInTheDocument();
    expect(screen.getByText(/Save 1 food/)).toBeInTheDocument();
  });

  it('clicking a selected food deselects it', async () => {
    const user = userEvent.setup();
    render(<AddFoodModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
    });

    // Select then deselect
    await user.click(screen.getByText('Chicken Breast'));
    expect(screen.getByText(/Save 1 food/)).toBeInTheDocument();

    await user.click(screen.getByText('Chicken Breast'));
    expect(screen.queryByText(/Save/)).not.toBeInTheDocument();
  });

  it('can select multiple foods', async () => {
    const user = userEvent.setup();
    render(<AddFoodModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Chicken Breast'));
    await user.click(screen.getByText('Brown Rice'));

    expect(screen.getByText(/Save 2 foods/)).toBeInTheDocument();
  });

  it('Select All selects all foods in the card', async () => {
    const user = userEvent.setup();
    render(<AddFoodModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Select All')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Select All'));

    expect(screen.getByText(/Save 2 foods/)).toBeInTheDocument();
    expect(screen.getByText('Deselect All')).toBeInTheDocument();
  });

  it('Deselect All removes all selections from the card', async () => {
    const user = userEvent.setup();
    render(<AddFoodModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Select All')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Select All'));
    expect(screen.getByText('Deselect All')).toBeInTheDocument();

    await user.click(screen.getByText('Deselect All'));
    expect(screen.queryByText(/Save/)).not.toBeInTheDocument();
    expect(screen.getByText('Select All')).toBeInTheDocument();
  });

  it('calls onClose when overlay is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const { container } = render(<AddFoodModal {...defaultProps} onClose={handleClose} />);

    const overlay = container.firstChild as HTMLElement;
    await user.click(overlay);
    expect(handleClose).toHaveBeenCalled();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<AddFoodModal {...defaultProps} onClose={handleClose} />);

    await user.click(screen.getByText('×'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('selects correct time block for various hours', () => {
    const { rerender } = render(<AddFoodModal {...defaultProps} hour={2} />);
    expect(screen.getByText('Early AM').closest('button')).toHaveClass('timeBlockActive');

    rerender(<AddFoodModal {...defaultProps} hour={7} />);
    expect(screen.getByText('Morning').closest('button')).toHaveClass('timeBlockActive');

    rerender(<AddFoodModal {...defaultProps} hour={12} />);
    expect(screen.getByText('Midday').closest('button')).toHaveClass('timeBlockActive');

    rerender(<AddFoodModal {...defaultProps} hour={19} />);
    expect(screen.getByText('Evening').closest('button')).toHaveClass('timeBlockActive');
  });

  it('submits batch payload when Save is clicked', async () => {
    const user = userEvent.setup();
    const fetchSpy = mockFetch(mockFoods, mockCounts);
    vi.stubGlobal('fetch', fetchSpy);

    const handleAdded = vi.fn();
    const handleClose = vi.fn();
    render(
      <AddFoodModal
        {...defaultProps}
        onAdded={handleAdded}
        onClose={handleClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Chicken Breast'));
    await user.click(screen.getByText(/Save 1 food/));

    await waitFor(() => {
      expect(handleAdded).toHaveBeenCalledTimes(1);
    });
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Should have made a POST to /api/log/batch
    const postCall = fetchSpy.mock.calls.find(
      (call: unknown[]) =>
        typeof call[0] === 'string' &&
        call[0].includes('/log/batch') &&
        (call[1] as Record<string, unknown>)?.method === 'POST',
    );
    expect(postCall).toBeDefined();
  });
});
