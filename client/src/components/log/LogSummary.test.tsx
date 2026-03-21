import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LogSummary from './LogSummary';

describe('LogSummary', () => {
  it('renders calorie count', () => {
    render(<LogSummary calories={1850} protein={120} fat={60} carbs={200} />);
    expect(screen.getByText('1850')).toBeInTheDocument();
    expect(screen.getByText('cal')).toBeInTheDocument();
  });

  it('renders protein value with P label', () => {
    render(<LogSummary calories={1850} protein={120} fat={60} carbs={200} />);
    expect(screen.getByText('120g')).toBeInTheDocument();
    expect(screen.getByText('P')).toBeInTheDocument();
  });

  it('renders fat value with F label', () => {
    render(<LogSummary calories={1850} protein={120} fat={60} carbs={200} />);
    expect(screen.getByText('60g')).toBeInTheDocument();
    expect(screen.getByText('F')).toBeInTheDocument();
  });

  it('renders carbs value with C label', () => {
    render(<LogSummary calories={1850} protein={120} fat={60} carbs={200} />);
    expect(screen.getByText('200g')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('rounds decimal values', () => {
    render(<LogSummary calories={1850.7} protein={120.3} fat={59.8} carbs={200.5} />);
    expect(screen.getByText('1851')).toBeInTheDocument();
    expect(screen.getByText('120g')).toBeInTheDocument();
    expect(screen.getByText('60g')).toBeInTheDocument();
    expect(screen.getByText('201g')).toBeInTheDocument();
  });

  it('handles zero values', () => {
    render(<LogSummary calories={0} protein={0} fat={0} carbs={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
    const zeroGs = screen.getAllByText('0g');
    expect(zeroGs.length).toBe(3);
  });

  it('renders four badges', () => {
    const { container } = render(
      <LogSummary calories={1850} protein={120} fat={60} carbs={200} />
    );
    const badges = container.querySelectorAll('[class*="badge"]');
    expect(badges.length).toBeGreaterThanOrEqual(4);
  });
});
