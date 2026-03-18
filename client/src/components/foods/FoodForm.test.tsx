import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FoodForm from './FoodForm';

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const defaultProps = {
  open: true,
  food: null,
  onClose: vi.fn(),
  onSaved: vi.fn(),
};

const existingFood = {
  id: 'food-1',
  name: 'Chicken Breast',
  emoji: '\ud83c\udf57',
  category: 'proteins',
  servingLabel: '100g',
  calories: '165',
  protein: '31',
  fat: '3.6',
  carbs: '0',
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('FoodForm', () => {
  it('renders nothing when not open', () => {
    const { container } = render(<FoodForm {...defaultProps} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows "New Food" title when creating', () => {
    render(<FoodForm {...defaultProps} />);
    expect(screen.getByText('New Food')).toBeInTheDocument();
  });

  it('shows "Edit Food" title when editing', () => {
    render(<FoodForm {...defaultProps} food={existingFood} />);
    expect(screen.getByText('Edit Food')).toBeInTheDocument();
  });

  it('renders form fields: Name, Category, Serving Label, Serving Size, Calories, Protein, Fat, Carbs', () => {
    render(<FoodForm {...defaultProps} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Serving Label')).toBeInTheDocument();
    expect(screen.getByText('Serving Size')).toBeInTheDocument();
    expect(screen.getByText('Calories')).toBeInTheDocument();
    expect(screen.getByText('Protein (g)')).toBeInTheDocument();
    expect(screen.getByText('Fat (g)')).toBeInTheDocument();
    expect(screen.getByText('Carbs (g)')).toBeInTheDocument();
  });

  it('renders emoji picker buttons', () => {
    const { container } = render(<FoodForm {...defaultProps} />);

    // Should have at least 10 emoji buttons
    const emojiButtons = container.querySelectorAll('[class*="emojiBtn"]');
    expect(emojiButtons.length).toBeGreaterThanOrEqual(10);
  });

  it('pre-fills form when editing existing food', () => {
    render(<FoodForm {...defaultProps} food={existingFood} />);

    const nameInput = screen.getByDisplayValue('Chicken Breast');
    expect(nameInput).toBeInTheDocument();

    const servingInput = screen.getByDisplayValue('100g');
    expect(servingInput).toBeInTheDocument();

    const caloriesInput = screen.getByDisplayValue('165');
    expect(caloriesInput).toBeInTheDocument();
  });

  it('starts with empty fields for new food', () => {
    render(<FoodForm {...defaultProps} />);

    // The name field should be empty
    const inputs = screen.getAllByRole('textbox');
    const nameInput = inputs[0] as HTMLInputElement;
    expect(nameInput.value).toBe('');
  });

  it('shows "Create" button for new food', () => {
    render(<FoodForm {...defaultProps} />);
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('shows "Update" button for existing food', () => {
    render(<FoodForm {...defaultProps} food={existingFood} />);
    expect(screen.getByText('Update')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<FoodForm {...defaultProps} onClose={handleClose} />);

    await user.click(screen.getByText('\u00d7'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const { container } = render(<FoodForm {...defaultProps} onClose={handleClose} />);

    const overlay = container.firstChild as HTMLElement;
    await user.click(overlay);
    expect(handleClose).toHaveBeenCalled();
  });

  it('renders category dropdown with options', () => {
    render(<FoodForm {...defaultProps} />);

    const select = screen.getByDisplayValue('Favorites');
    expect(select).toBeInTheDocument();
    expect(select.tagName).toBe('SELECT');
  });

  it('submits new food with POST', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const handleSaved = vi.fn();
    const handleClose = vi.fn();
    render(
      <FoodForm {...defaultProps} onSaved={handleSaved} onClose={handleClose} />
    );

    // Fill in the required name field
    const nameInput = screen.getAllByRole('textbox')[0]!;
    await user.type(nameInput, 'My Food');
    await user.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(handleSaved).toHaveBeenCalledTimes(1);
    });
    expect(handleClose).toHaveBeenCalledTimes(1);

    const postCall = fetchSpy.mock.calls.find(
      (call: unknown[]) => call[0] === '/api/foods' && (call[1] as Record<string, unknown>)?.method === 'POST',
    );
    expect(postCall).toBeDefined();
  });

  it('submits existing food with PUT', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const handleSaved = vi.fn();
    render(
      <FoodForm {...defaultProps} food={existingFood} onSaved={handleSaved} />
    );

    await user.click(screen.getByText('Update'));

    await waitFor(() => {
      expect(handleSaved).toHaveBeenCalledTimes(1);
    });

    const putCall = fetchSpy.mock.calls.find(
      (call: unknown[]) => call[0] === '/api/foods/food-1' && (call[1] as Record<string, unknown>)?.method === 'PUT',
    );
    expect(putCall).toBeDefined();
  });

  it('shows "Saving..." while submitting', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
    );

    render(<FoodForm {...defaultProps} food={existingFood} />);
    await user.click(screen.getByText('Update'));

    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('clicking emoji selects it (active class)', async () => {
    const user = userEvent.setup();
    const { container } = render(<FoodForm {...defaultProps} />);

    const emojiButtons = container.querySelectorAll('[class*="emojiBtn"]');
    // Click on the first emoji
    await user.click(emojiButtons[0]!);

    // That button should get the active class
    expect(emojiButtons[0]!.classList.contains('emojiActive')).toBe(true);
  });
});
