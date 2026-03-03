import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AvgIntakeCard from './AvgIntakeCard';

// ── Setup ────────────────────────────────────────────────────────────────────

const mockIntakeData = [
  { date: '2025-01-01', calories: 1800 },
  { date: '2025-01-02', calories: 2000 },
  { date: '2025-01-03', calories: 2200 },
];

const mockUser = { calorieTarget: 2100 };

let fetchCallCount = 0;

beforeEach(() => {
  fetchCallCount = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/user')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUser),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockIntakeData),
      });
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AvgIntakeCard', () => {
  it('renders title "Avg Daily Intake"', () => {
    render(<AvgIntakeCard />);
    expect(screen.getByText('Avg Daily Intake')).toBeInTheDocument();
  });

  it('renders period selector with 7d, 14d, 30d', () => {
    render(<AvgIntakeCard />);
    expect(screen.getByText('7d')).toBeInTheDocument();
    expect(screen.getByText('14d')).toBeInTheDocument();
    expect(screen.getByText('30d')).toBeInTheDocument();
  });

  it('displays average calorie value', async () => {
    render(<AvgIntakeCard />);

    await waitFor(() => {
      // Average: (1800 + 2000 + 2200) / 3 = 2000
      expect(screen.getByText('2000')).toBeInTheDocument();
    });
  });

  it('renders SVG chart with bars', async () => {
    const { container } = render(<AvgIntakeCard />);

    await waitFor(() => {
      expect(screen.getByText('2000')).toBeInTheDocument();
    });

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();

    // Should have bars for each data point
    const rects = svg!.querySelectorAll('rect');
    expect(rects.length).toBe(3);
  });

  it('shows "No intake data" when API returns empty array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/user')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUser),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }),
    );

    render(<AvgIntakeCard />);

    await waitFor(() => {
      expect(screen.getByText('No intake data')).toBeInTheDocument();
    });
  });

  it('7d is initially active', () => {
    render(<AvgIntakeCard />);

    const btn7 = screen.getByText('7d');
    expect(btn7.classList.contains('active')).toBe(true);
  });
});
