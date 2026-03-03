import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TdeeCard from './TdeeCard';

// ── Setup ────────────────────────────────────────────────────────────────────

const mockTdeeData = [
  { date: '2025-01-01', tdeeEstimate: 2200, caloriesConsumed: 1800 },
  { date: '2025-01-02', tdeeEstimate: 2250, caloriesConsumed: 2000 },
  { date: '2025-01-03', tdeeEstimate: 2280, caloriesConsumed: 1900 },
];

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTdeeData),
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('TdeeCard', () => {
  it('renders title "TDEE"', async () => {
    render(<TdeeCard />);

    expect(screen.getByText('TDEE')).toBeInTheDocument();
  });

  it('renders period selector with 7d, 14d, 30d', () => {
    render(<TdeeCard />);

    expect(screen.getByText('7d')).toBeInTheDocument();
    expect(screen.getByText('14d')).toBeInTheDocument();
    expect(screen.getByText('30d')).toBeInTheDocument();
  });

  it('displays latest TDEE value from data', async () => {
    render(<TdeeCard />);

    await waitFor(() => {
      expect(screen.getByText('2280')).toBeInTheDocument();
    });
  });

  it('renders SVG chart when data has multiple points', async () => {
    const { container } = render(<TdeeCard />);

    await waitFor(() => {
      expect(screen.getByText('2280')).toBeInTheDocument();
    });

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('shows "No TDEE data" when API returns empty array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      }),
    );

    render(<TdeeCard />);

    await waitFor(() => {
      expect(screen.getByText('No TDEE data')).toBeInTheDocument();
    });
  });

  it('14d is initially active', () => {
    render(<TdeeCard />);

    const btn14 = screen.getByText('14d');
    expect(btn14.classList.contains('active')).toBe(true);
  });

  it('clicking period button changes active period', async () => {
    const user = userEvent.setup();
    render(<TdeeCard />);

    await user.click(screen.getByText('30d'));

    const btn30 = screen.getByText('30d');
    expect(btn30.classList.contains('active')).toBe(true);
  });
});
