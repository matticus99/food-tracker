import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AvgIntakeCard from './AvgIntakeCard';

// ── Helpers ─────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0]!;
}

// ── Test data ───────────────────────────────────────────────────────────────

const mockIntakeData = [
  { date: daysAgo(2), calories: 1800 },
  { date: daysAgo(1), calories: 2000 },
  { date: daysAgo(0), calories: 2200 },
];

const calorieTarget = 2100;

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AvgIntakeCard', () => {
  it('renders title "Avg Daily Intake"', () => {
    render(<AvgIntakeCard data={mockIntakeData} calorieTarget={calorieTarget} />);
    expect(screen.getByText('Avg Daily Intake')).toBeInTheDocument();
  });

  it('renders period selector with 7d, 14d, 30d', () => {
    render(<AvgIntakeCard data={mockIntakeData} calorieTarget={calorieTarget} />);
    expect(screen.getByText('7d')).toBeInTheDocument();
    expect(screen.getByText('14d')).toBeInTheDocument();
    expect(screen.getByText('30d')).toBeInTheDocument();
  });

  it('displays average calorie value', () => {
    render(<AvgIntakeCard data={mockIntakeData} calorieTarget={calorieTarget} />);
    // Average: (1800 + 2000 + 2200) / 3 = 2000
    expect(screen.getByText('2000')).toBeInTheDocument();
  });

  it('renders SVG chart with bars', () => {
    const { container } = render(
      <AvgIntakeCard data={mockIntakeData} calorieTarget={calorieTarget} />,
    );
    expect(screen.getByText('2000')).toBeInTheDocument();

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();

    // Should have bars for each data point
    const rects = svg!.querySelectorAll('rect');
    expect(rects.length).toBe(3);
  });

  it('shows "No intake data" when data is empty', () => {
    render(<AvgIntakeCard data={[]} calorieTarget={calorieTarget} />);
    expect(screen.getByText('No intake data')).toBeInTheDocument();
  });

  it('7d is initially active', () => {
    render(<AvgIntakeCard data={mockIntakeData} calorieTarget={calorieTarget} />);

    const btn7 = screen.getByText('7d');
    expect(btn7.classList.contains('active')).toBe(true);
  });
});
