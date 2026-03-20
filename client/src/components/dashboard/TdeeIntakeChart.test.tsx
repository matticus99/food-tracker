import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TdeeIntakeChart from './TdeeIntakeChart';

describe('TdeeIntakeChart', () => {
  it('shows "No data yet" when data is empty', () => {
    render(<TdeeIntakeChart data={[]} avgTdee={0} avgIntake={0} />);

    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });

  it('renders title "TDEE vs Intake"', () => {
    render(<TdeeIntakeChart data={[]} avgTdee={0} avgIntake={0} />);

    expect(screen.getByText('TDEE vs Intake')).toBeInTheDocument();
  });

  it('renders 7d badge', () => {
    render(<TdeeIntakeChart data={[]} avgTdee={0} avgIntake={0} />);

    expect(screen.getByText('7d')).toBeInTheDocument();
  });

  it('displays TDEE and Avg stats when data is provided', () => {
    const data = [
      { date: '2025-01-01', tdee: 2200, intake: 1800 },
      { date: '2025-01-02', tdee: 2300, intake: 2000 },
    ];
    render(<TdeeIntakeChart data={data} avgTdee={2250} avgIntake={1900} />);

    expect(screen.getAllByText('TDEE').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Avg')).toBeInTheDocument();
    expect(screen.getByText('2250')).toBeInTheDocument();
    expect(screen.getByText('1900')).toBeInTheDocument();
  });

  it('rounds average values', () => {
    const data = [
      { date: '2025-01-01', tdee: 2200, intake: 1800 },
    ];
    render(<TdeeIntakeChart data={data} avgTdee={2200.7} avgIntake={1800.3} />);

    expect(screen.getByText('2201')).toBeInTheDocument();
    expect(screen.getByText('1800')).toBeInTheDocument();
  });

  it('renders SVG chart when data is provided', () => {
    const data = [
      { date: '2025-01-01', tdee: 2200, intake: 1800 },
      { date: '2025-01-02', tdee: 2300, intake: 2000 },
    ];
    const { container } = render(
      <TdeeIntakeChart data={data} avgTdee={2250} avgIntake={1900} />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders chart area for TDEE and Intake', () => {
    const data = [
      { date: '2025-01-01', tdee: 2200, intake: 1800 },
    ];
    const { container } = render(
      <TdeeIntakeChart data={data} avgTdee={2200} avgIntake={1800} />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('handles data with missing tdee values', () => {
    const data = [
      { date: '2025-01-01', intake: 1800 },
      { date: '2025-01-02', tdee: 2300, intake: 2000 },
    ];
    const { container } = render(
      <TdeeIntakeChart data={data} avgTdee={2300} avgIntake={1900} />
    );

    // Should not crash, SVG should still render
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('handles data with missing intake values', () => {
    const data = [
      { date: '2025-01-01', tdee: 2200 },
      { date: '2025-01-02', tdee: 2300 },
    ];
    const { container } = render(
      <TdeeIntakeChart data={data} avgTdee={2250} avgIntake={0} />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('handles single data point', () => {
    const data = [{ date: '2025-01-01', tdee: 2200, intake: 1800 }];
    const { container } = render(
      <TdeeIntakeChart data={data} avgTdee={2200} avgIntake={1800} />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders target stat when targetCalories is provided', () => {
    const data = [
      { date: '2025-01-01', tdee: 2200, intake: 1800 },
      { date: '2025-01-02', tdee: 2300, intake: 2000 },
    ];
    render(
      <TdeeIntakeChart data={data} avgTdee={2250} avgIntake={1900} targetCalories={2000} />
    );

    const targetLabels = screen.getAllByText('Target');
    expect(targetLabels.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('2000')).toBeInTheDocument();
  });

  it('does not render target stat when targetCalories is undefined', () => {
    const data = [
      { date: '2025-01-01', tdee: 2200, intake: 1800 },
    ];
    render(
      <TdeeIntakeChart data={data} avgTdee={2200} avgIntake={1800} />
    );

    expect(screen.queryByText('Target')).not.toBeInTheDocument();
  });

  it('renders target stat when targetCalories is provided (with dashed line)', () => {
    const data = [
      { date: '2025-01-01', tdee: 2200, intake: 1800 },
    ];
    const { container } = render(
      <TdeeIntakeChart data={data} avgTdee={2200} avgIntake={1800} targetCalories={2000} />
    );

    const dashedLine = container.querySelector('line[stroke-dasharray]');
    expect(dashedLine).toBeInTheDocument();
  });

  it('renders dashed target line in SVG', () => {
    const data = [
      { date: '2025-01-01', tdee: 2200, intake: 1800 },
      { date: '2025-01-02', tdee: 2300, intake: 2000 },
    ];
    const { container } = render(
      <TdeeIntakeChart data={data} avgTdee={2250} avgIntake={1900} targetCalories={2000} />
    );

    const dashedLine = container.querySelector('line[stroke-dasharray]');
    expect(dashedLine).toBeInTheDocument();
  });
});
