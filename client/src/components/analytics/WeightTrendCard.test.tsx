import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WeightTrendCard from './WeightTrendCard';
import { toLocalDateStr } from '../../utils/date';

// ── Helpers ─────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalDateStr(d);
}

// ── Test data ───────────────────────────────────────────────────────────────

const mockWeightData = [
  { date: daysAgo(2), weight: 182.0, trend: 182.0 },
  { date: daysAgo(1), weight: 181.5, trend: 181.8 },
  { date: daysAgo(0), weight: 181.0, trend: 181.5 },
];

// ── Tests ────────────────────────────────────────────────────────────────────

describe('WeightTrendCard', () => {
  it('renders title "Weight Trend"', () => {
    render(<WeightTrendCard data={mockWeightData} />);
    expect(screen.getByText('Weight Trend')).toBeInTheDocument();
  });

  it('renders period selector', () => {
    render(<WeightTrendCard data={mockWeightData} />);
    expect(screen.getByText('7d')).toBeInTheDocument();
    expect(screen.getByText('14d')).toBeInTheDocument();
    expect(screen.getByText('30d')).toBeInTheDocument();
  });

  it('displays latest trend value', () => {
    render(<WeightTrendCard data={mockWeightData} />);
    expect(screen.getByText('181.5')).toBeInTheDocument();
  });

  it('shows weight change from first to last point', () => {
    render(<WeightTrendCard data={mockWeightData} />);
    // Change = 181.5 - 182.0 = -0.5
    expect(screen.getByText(/-0.5 lbs/)).toBeInTheDocument();
  });

  it('shows "No weight data" when data is empty', () => {
    render(<WeightTrendCard data={[]} />);
    expect(screen.getByText('No weight data')).toBeInTheDocument();
  });

  it('renders SVG chart with multiple data points', () => {
    const { container } = render(<WeightTrendCard data={mockWeightData} />);
    expect(screen.getByText('181.5')).toBeInTheDocument();

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('shows positive change with + prefix', () => {
    const gainData = [
      { date: daysAgo(2), weight: 180, trend: 180 },
      { date: daysAgo(1), weight: 182, trend: 181 },
      { date: daysAgo(0), weight: 183, trend: 182.5 },
    ];

    render(<WeightTrendCard data={gainData} />);
    expect(screen.getByText(/\+2.5 lbs/)).toBeInTheDocument();
  });
});
