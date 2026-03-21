import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActualVsGoalCard from './ActualVsGoalCard';
import { toLocalDateStr } from '../../utils/date';

// ── Helpers ─────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalDateStr(d);
}

// ── Test data ───────────────────────────────────────────────────────────────

const mockData = [
  { date: daysAgo(2), calories: 1800 },
  { date: daysAgo(1), calories: 2200 },
  { date: daysAgo(0), calories: 1900 },
];

const calorieTarget = 2000;

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ActualVsGoalCard', () => {
  it('renders title "Actual vs Goal"', () => {
    render(<ActualVsGoalCard data={mockData} calorieTarget={calorieTarget} />);
    expect(screen.getByText('Actual vs Goal')).toBeInTheDocument();
  });

  it('renders period selector', () => {
    render(<ActualVsGoalCard data={mockData} calorieTarget={calorieTarget} />);
    expect(screen.getByText('7d')).toBeInTheDocument();
    expect(screen.getByText('14d')).toBeInTheDocument();
    expect(screen.getByText('30d')).toBeInTheDocument();
  });

  it('renders chart with data points', () => {
    const { container } = render(
      <ActualVsGoalCard data={mockData} calorieTarget={calorieTarget} />,
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders dots for each data point', () => {
    const { container } = render(
      <ActualVsGoalCard data={mockData} calorieTarget={calorieTarget} />,
    );
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(3);
  });

  it('renders legend with Under, Over, and Goal', () => {
    render(<ActualVsGoalCard data={mockData} calorieTarget={calorieTarget} />);
    expect(screen.getByText('Under')).toBeInTheDocument();
    expect(screen.getByText('Over')).toBeInTheDocument();
    expect(screen.getByText('Goal')).toBeInTheDocument();
  });

  it('shows "No data yet" when data has fewer than 2 points', () => {
    const singlePoint = [{ date: daysAgo(0), calories: 1800 }];
    render(<ActualVsGoalCard data={singlePoint} calorieTarget={calorieTarget} />);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });

  it('shows "No data yet" when data is empty', () => {
    render(<ActualVsGoalCard data={[]} calorieTarget={calorieTarget} />);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });

  it('7d is initially active', () => {
    render(<ActualVsGoalCard data={mockData} calorieTarget={calorieTarget} />);

    const btn7 = screen.getByText('7d');
    expect(btn7.classList.contains('active')).toBe(true);
  });
});
