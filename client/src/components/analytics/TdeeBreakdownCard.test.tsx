import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TdeeBreakdownCard from './TdeeBreakdownCard';

// ── Setup ────────────────────────────────────────────────────────────────────

const mockBmrData = {
  bmr: 1750,
  activityLevel: 1.55,
  estimatedTdee: 2713,
  calorieTarget: 2200,
};

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBmrData),
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('TdeeBreakdownCard', () => {
  it('renders title "TDEE Breakdown"', () => {
    render(<TdeeBreakdownCard />);
    expect(screen.getByText('TDEE Breakdown')).toBeInTheDocument();
  });

  it('shows "Loading..." before data arrives', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => new Promise(() => {})),
    );

    render(<TdeeBreakdownCard />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays BMR value with cal unit', async () => {
    render(<TdeeBreakdownCard />);

    await waitFor(() => {
      expect(screen.getByText('1750')).toBeInTheDocument();
    });
    expect(screen.getByText('BMR')).toBeInTheDocument();
  });

  it('displays Activity level with x suffix', async () => {
    render(<TdeeBreakdownCard />);

    await waitFor(() => {
      expect(screen.getByText('1.55\u00d7')).toBeInTheDocument();
    });
    expect(screen.getByText('Activity')).toBeInTheDocument();
  });

  it('displays Estimated TDEE', async () => {
    render(<TdeeBreakdownCard />);

    await waitFor(() => {
      expect(screen.getByText('2713')).toBeInTheDocument();
    });
    expect(screen.getByText('Est. TDEE')).toBeInTheDocument();
  });

  it('displays calorie target', async () => {
    render(<TdeeBreakdownCard />);

    await waitFor(() => {
      expect(screen.getByText('2200')).toBeInTheDocument();
    });
    expect(screen.getByText('Target')).toBeInTheDocument();
  });

  it('renders 4 stat items', async () => {
    const { container } = render(<TdeeBreakdownCard />);

    await waitFor(() => {
      expect(screen.getByText('BMR')).toBeInTheDocument();
    });

    const labels = ['BMR', 'Activity', 'Est. TDEE', 'Target'];
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('shows cal unit for BMR, Est. TDEE, and Target', async () => {
    render(<TdeeBreakdownCard />);

    await waitFor(() => {
      expect(screen.getByText('BMR')).toBeInTheDocument();
    });

    const calUnits = screen.getAllByText('cal');
    expect(calUnits.length).toBe(3);
  });
});
