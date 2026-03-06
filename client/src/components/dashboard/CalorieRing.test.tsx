import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CalorieRing from './CalorieRing';

describe('CalorieRing', () => {
  it('shows remaining calories (target - consumed)', () => {
    render(<CalorieRing consumed={800} target={2000} />);

    expect(screen.getByText('1200')).toBeInTheDocument();
  });

  it('shows REMAINING label', () => {
    render(<CalorieRing consumed={800} target={2000} />);

    expect(screen.getByText('remaining')).toBeInTheDocument();
  });

  it('shows "over" label when consumed > target', () => {
    render(<CalorieRing consumed={2500} target={2000} />);

    expect(screen.getByText('over')).toBeInTheDocument();
    // remaining should show negative difference
    expect(screen.getByText('-500')).toBeInTheDocument();
  });

  it('handles zero consumed', () => {
    render(<CalorieRing consumed={0} target={2000} />);

    expect(screen.getByText('2000')).toBeInTheDocument();
    expect(screen.getByText('remaining')).toBeInTheDocument();
  });

  it('handles consumed equal to target', () => {
    render(<CalorieRing consumed={2000} target={2000} />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('remaining')).toBeInTheDocument();
  });

  it('renders SVG ring element', () => {
    const { container } = render(<CalorieRing consumed={500} target={2000} />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();

    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(2); // track + progress
  });
});
