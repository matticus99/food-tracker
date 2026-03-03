import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TdeeBreakdownCard from './TdeeBreakdownCard';

// ── Test data ───────────────────────────────────────────────────────────────

const mockBmrData = {
  bmr: 1750,
  activityLevel: 1.55,
  estimatedTdee: 2713,
  calorieTarget: 2200,
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('TdeeBreakdownCard', () => {
  it('renders title "TDEE Breakdown"', () => {
    render(<TdeeBreakdownCard data={mockBmrData} />);
    expect(screen.getByText('TDEE Breakdown')).toBeInTheDocument();
  });

  it('shows "Loading..." when data is null', () => {
    render(<TdeeBreakdownCard data={null} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays BMR value with cal unit', () => {
    render(<TdeeBreakdownCard data={mockBmrData} />);
    expect(screen.getByText('1750')).toBeInTheDocument();
    expect(screen.getByText('BMR')).toBeInTheDocument();
  });

  it('displays Activity level with × suffix', () => {
    render(<TdeeBreakdownCard data={mockBmrData} />);
    expect(screen.getByText('1.55×')).toBeInTheDocument();
    expect(screen.getByText('Activity')).toBeInTheDocument();
  });

  it('displays Estimated TDEE', () => {
    render(<TdeeBreakdownCard data={mockBmrData} />);
    expect(screen.getByText('2713')).toBeInTheDocument();
    expect(screen.getByText('Est. TDEE')).toBeInTheDocument();
  });

  it('displays calorie target', () => {
    render(<TdeeBreakdownCard data={mockBmrData} />);
    expect(screen.getByText('2200')).toBeInTheDocument();
    expect(screen.getByText('Target')).toBeInTheDocument();
  });

  it('renders 4 stat items', () => {
    render(<TdeeBreakdownCard data={mockBmrData} />);

    const labels = ['BMR', 'Activity', 'Est. TDEE', 'Target'];
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('shows cal unit for BMR, Est. TDEE, and Target', () => {
    render(<TdeeBreakdownCard data={mockBmrData} />);

    const calUnits = screen.getAllByText('cal');
    expect(calUnits.length).toBe(3);
  });
});
