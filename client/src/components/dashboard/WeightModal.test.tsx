import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clearCsrfToken } from '../../hooks/useApi';
import WeightModal from './WeightModal';

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  clearCsrfToken();
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
  date: '2025-06-15',
  onClose: vi.fn(),
  onSaved: vi.fn(),
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('WeightModal', () => {
  it('renders nothing when not open', () => {
    const { container } = render(<WeightModal {...defaultProps} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal title when open', () => {
    render(<WeightModal {...defaultProps} />);
    expect(screen.getByText('Log Weight')).toBeInTheDocument();
  });

  it('displays formatted date', () => {
    render(<WeightModal {...defaultProps} date="2025-06-15" />);
    // Should show formatted date like "Sun, Jun 15"
    const dateEl = screen.getByText(/Jun/);
    expect(dateEl).toBeInTheDocument();
  });

  it('shows "lbs" unit label', () => {
    render(<WeightModal {...defaultProps} />);
    expect(screen.getByText('lbs')).toBeInTheDocument();
  });

  it('pre-fills weight input when currentWeight is provided', () => {
    render(<WeightModal {...defaultProps} currentWeight={185.5} />);
    const input = screen.getByPlaceholderText('0.0') as HTMLInputElement;
    expect(input.value).toBe('185.5');
  });

  it('shows empty input when no currentWeight', () => {
    render(<WeightModal {...defaultProps} />);
    const input = screen.getByPlaceholderText('0.0') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('Save button is disabled when weight is empty', () => {
    render(<WeightModal {...defaultProps} />);
    const saveBtn = screen.getByText('Save');
    expect(saveBtn).toBeDisabled();
  });

  it('Save button is enabled when weight is entered', async () => {
    const user = userEvent.setup();
    render(<WeightModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('0.0');
    await user.type(input, '180');

    const saveBtn = screen.getByText('Save');
    expect(saveBtn).not.toBeDisabled();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<WeightModal {...defaultProps} onClose={handleClose} />);

    await user.click(screen.getByText('Cancel'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const { container } = render(<WeightModal {...defaultProps} onClose={handleClose} />);

    // Click the overlay (outermost div)
    const overlay = container.firstChild as HTMLElement;
    await user.click(overlay);
    expect(handleClose).toHaveBeenCalled();
  });

  it('does not close when modal content is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<WeightModal {...defaultProps} onClose={handleClose} />);

    // Click on the title inside the modal
    await user.click(screen.getByText('Log Weight'));
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('submits weight and calls onSaved', async () => {
    const user = userEvent.setup();
    const handleSaved = vi.fn();
    const handleClose = vi.fn();
    render(
      <WeightModal
        {...defaultProps}
        onSaved={handleSaved}
        onClose={handleClose}
      />
    );

    const input = screen.getByPlaceholderText('0.0');
    await user.type(input, '175.5');
    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(handleSaved).toHaveBeenCalledTimes(1);
    });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('sends correct API request on submit', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ token: 'csrf-tok' }) })
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    vi.stubGlobal('fetch', fetchSpy);

    render(<WeightModal {...defaultProps} date="2025-06-15" />);

    const input = screen.getByPlaceholderText('0.0');
    await user.type(input, '180');
    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/weight', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'csrf-tok' },
        method: 'POST',
        body: JSON.stringify({ date: '2025-06-15', weight: 180 }),
      });
    });
  });

  it('shows "Saving..." text while submitting', async () => {
    const user = userEvent.setup();
    // Make fetch hang to keep submitting state
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        () => new Promise(() => {}), // Never resolves
      ),
    );

    render(<WeightModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('0.0');
    await user.type(input, '180');
    await user.click(screen.getByText('Save'));

    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('has a number input with step 0.1', () => {
    render(<WeightModal {...defaultProps} />);
    const input = screen.getByPlaceholderText('0.0');
    expect(input).toHaveAttribute('type', 'number');
    expect(input).toHaveAttribute('step', '0.1');
  });
});
