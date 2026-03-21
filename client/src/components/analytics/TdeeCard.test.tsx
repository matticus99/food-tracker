import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TdeeCard from './TdeeCard';
import { toLocalDateStr } from '../../utils/date';

// ── Helpers ─────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalDateStr(d);
}

// ── Test data ───────────────────────────────────────────────────────────────

const mockTdeeData = [
  { date: daysAgo(2), tdeeEstimate: 2200, caloriesConsumed: 1800 },
  { date: daysAgo(1), tdeeEstimate: 2250, caloriesConsumed: 2000 },
  { date: daysAgo(0), tdeeEstimate: 2280, caloriesConsumed: 1900 },
];

// ── Tests ────────────────────────────────────────────────────────────────────

describe('TdeeCard', () => {
  it('renders title "TDEE"', () => {
    render(<TdeeCard data={mockTdeeData} />);
    expect(screen.getByText('TDEE')).toBeInTheDocument();
  });

  it('renders period selector with 30d', () => {
    render(<TdeeCard data={mockTdeeData} />);
    expect(screen.getByText('30d')).toBeInTheDocument();
  });

  it('displays latest TDEE value from data', () => {
    render(<TdeeCard data={mockTdeeData} />);
    expect(screen.getByText('2280')).toBeInTheDocument();
  });

  it('renders SVG chart when data has multiple points', () => {
    const { container } = render(<TdeeCard data={mockTdeeData} />);
    expect(screen.getByText('2280')).toBeInTheDocument();

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('shows "No TDEE data" when data is empty', () => {
    render(<TdeeCard data={[]} />);
    expect(screen.getByText('No TDEE data')).toBeInTheDocument();
  });

  it('30d is initially active', () => {
    render(<TdeeCard data={mockTdeeData} />);

    const btn30 = screen.getByText('30d');
    expect(btn30.classList.contains('active')).toBe(true);
  });
});
