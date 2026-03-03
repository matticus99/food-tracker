import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddFoodModal from './AddFoodModal';

// ── Mock data ────────────────────────────────────────────────────────────────

const mockFoods = [
  {
    id: 'f1',
    name: 'Chicken Breast',
    emoji: '\ud83c\udf57',
    category: 'proteins',
    servingLabel: '100g',
    calories: '165',
    protein: '31',
    fat: '3.6',
    carbs: '0',
  },
  {
    id: 'f2',
    name: 'Brown Rice',
    emoji: '\ud83c\udf5a',
    category: 'grains',
    servingLabel: '1 cup',
    calories: '216',
    protein: '5',
    fat: '1.8',
    carbs: '45',
  },
];

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockFoods),
    }),
  );
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

  it('renders modal title with formatted hour', () => {
    render(<AddFoodModal {...defaultProps} hour={12} />);
    expect(screen.getByText(/Add Food.*12 PM/)).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<AddFoodModal {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search foods...')).toBeInTheDocument();
  });

  it('displays food list from API', async () => {
    render(<AddFoodModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
    });
    expect(screen.getByText('Brown Rice')).toBeInTheDocument();
  });

  it('shows food emoji and serving info', async () => {
    render(<AddFoodModal {...defaultProps} />);

    await waitFor(() => {
      // "100g" is embedded in "100g · 165 cal" so use substring matcher
      expect(screen.getByText(/100g/)).toBeInTheDocument();
    });
  });

  it('shows "No foods found" when API returns empty list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      }),
    );

    render(<AddFoodModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('No foods found')).toBeInTheDocument();
    });
  });

  it('clicking a food shows confirmation view', async () => {
    const user = userEvent.setup();
    render(<AddFoodModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Chicken Breast'));

    // Should now show servings input and Add button
    expect(screen.getByText('Add')).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('shows macro preview after selecting a food', async () => {
    const user = userEvent.setup();
    render(<AddFoodModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Chicken Breast'));

    // Shows calorie info for 1 serving
    expect(screen.getByText('165 cal')).toBeInTheDocument();
  });

  it('clicking Back returns to food list', async () => {
    const user = userEvent.setup();
    render(<AddFoodModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Chicken Breast'));
    expect(screen.getByText('Back')).toBeInTheDocument();

    await user.click(screen.getByText('Back'));

    // Should be back at the search view
    expect(screen.getByPlaceholderText('Search foods...')).toBeInTheDocument();
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

    // The close button has '×' text
    await user.click(screen.getByText('\u00d7'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('formats various hours correctly', () => {
    const { rerender } = render(<AddFoodModal {...defaultProps} hour={0} />);
    expect(screen.getByText(/12 AM/)).toBeInTheDocument();

    rerender(<AddFoodModal {...defaultProps} hour={7} />);
    expect(screen.getByText(/7 AM/)).toBeInTheDocument();

    rerender(<AddFoodModal {...defaultProps} hour={12} />);
    expect(screen.getByText(/12 PM/)).toBeInTheDocument();

    rerender(<AddFoodModal {...defaultProps} hour={18} />);
    expect(screen.getByText(/6 PM/)).toBeInTheDocument();
  });

  it('submits with correct payload when Add is clicked', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockFoods),
    });
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
    await user.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(handleAdded).toHaveBeenCalledTimes(1);
    });
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Should have made a POST to /api/log
    const postCall = fetchSpy.mock.calls.find(
      (call: string[]) => call[0] === '/api/log' && call[1]?.method === 'POST',
    );
    expect(postCall).toBeDefined();
  });
});
