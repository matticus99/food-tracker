import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import WeightTrendCard from './WeightTrendCard';

// ── Setup ────────────────────────────────────────────────────────────────────

const mockWeightData = [
  { date: '2025-01-01', weight: 182.0, trend: 182.0 },
  { date: '2025-01-02', weight: 181.5, trend: 181.8 },
  { date: '2025-01-03', weight: 181.0, trend: 181.5 },
];

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockWeightData),
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('WeightTrendCard', () => {
  it('renders title "Weight Trend"', () => {
    render(<WeightTrendCard />);
    expect(screen.getByText('Weight Trend')).toBeInTheDocument();
  });

  it('renders period selector', () => {
    render(<WeightTrendCard />);
    expect(screen.getByText('7d')).toBeInTheDocument();
    expect(screen.getByText('14d')).toBeInTheDocument();
    expect(screen.getByText('30d')).toBeInTheDocument();
  });

  it('displays latest trend value', async () => {
    render(<WeightTrendCard />);

    await waitFor(() => {
      expect(screen.getByText('181.5')).toBeInTheDocument();
    });
  });

  it('shows weight change from first to last point', async () => {
    render(<WeightTrendCard />);

    await waitFor(() => {
      // Change = 181.5 - 182.0 = -0.5
      expect(screen.getByText(/-0.5 lbs/)).toBeInTheDocument();
    });
  });

  it('shows "No weight data" when API returns empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      }),
    );

    render(<WeightTrendCard />);

    await waitFor(() => {
      expect(screen.getByText('No weight data')).toBeInTheDocument();
    });
  });

  it('renders SVG chart with multiple data points', async () => {
    const { container } = render(<WeightTrendCard />);

    await waitFor(() => {
      expect(screen.getByText('181.5')).toBeInTheDocument();
    });

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('shows positive change with + prefix', async () => {
    const gainData = [
      { date: '2025-01-01', weight: 180, trend: 180 },
      { date: '2025-01-02', weight: 182, trend: 181 },
      { date: '2025-01-03', weight: 183, trend: 182.5 },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(gainData),
      }),
    );

    render(<WeightTrendCard />);

    await waitFor(() => {
      expect(screen.getByText(/\+2.5 lbs/)).toBeInTheDocument();
    });
  });
});
