import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ActualVsGoalCard from './ActualVsGoalCard';

// ── Setup ────────────────────────────────────────────────────────────────────

const mockData = [
  { date: '2025-01-01', actual: 1800, goal: 2000, diff: -200 },
  { date: '2025-01-02', actual: 2200, goal: 2000, diff: 200 },
  { date: '2025-01-03', actual: 1900, goal: 2000, diff: -100 },
];

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ActualVsGoalCard', () => {
  it('renders title "Actual vs Goal"', () => {
    render(<ActualVsGoalCard />);
    expect(screen.getByText('Actual vs Goal')).toBeInTheDocument();
  });

  it('renders period selector', () => {
    render(<ActualVsGoalCard />);
    expect(screen.getByText('7d')).toBeInTheDocument();
    expect(screen.getByText('14d')).toBeInTheDocument();
    expect(screen.getByText('30d')).toBeInTheDocument();
  });

  it('renders chart with data points', async () => {
    const { container } = render(<ActualVsGoalCard />);

    await waitFor(() => {
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  it('renders dots for each data point', async () => {
    const { container } = render(<ActualVsGoalCard />);

    await waitFor(() => {
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBe(3);
    });
  });

  it('renders legend with Under, Over, and Goal', async () => {
    render(<ActualVsGoalCard />);

    await waitFor(() => {
      expect(screen.getByText('Under')).toBeInTheDocument();
      expect(screen.getByText('Over')).toBeInTheDocument();
      expect(screen.getByText('Goal')).toBeInTheDocument();
    });
  });

  it('shows "No data yet" when API returns less than 2 data points', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ date: '2025-01-01', actual: 1800, goal: 2000, diff: -200 }]),
      }),
    );

    render(<ActualVsGoalCard />);

    await waitFor(() => {
      expect(screen.getByText('No data yet')).toBeInTheDocument();
    });
  });

  it('shows "No data yet" when API returns empty array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      }),
    );

    render(<ActualVsGoalCard />);

    await waitFor(() => {
      expect(screen.getByText('No data yet')).toBeInTheDocument();
    });
  });

  it('7d is initially active', () => {
    render(<ActualVsGoalCard />);

    const btn7 = screen.getByText('7d');
    expect(btn7.classList.contains('active')).toBe(true);
  });
});
