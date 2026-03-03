import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PageHeader from './PageHeader';

describe('PageHeader', () => {
  it('renders title', () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders title as h1', () => {
    render(<PageHeader title="Food Log" />);
    const heading = screen.getByText('Food Log');
    expect(heading.tagName).toBe('H1');
  });

  it('renders date when provided', () => {
    render(<PageHeader title="Dashboard" date="Monday, January 1" />);
    expect(screen.getByText('Monday, January 1')).toBeInTheDocument();
  });

  it('does not render date when not provided', () => {
    const { container } = render(<PageHeader title="Dashboard" />);
    const dateDiv = container.querySelector('[class*="date"]');
    expect(dateDiv).toBeNull();
  });

  it('renders inside a header element', () => {
    const { container } = render(<PageHeader title="Analytics" />);
    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();
  });

  it('renders different titles', () => {
    const { rerender } = render(<PageHeader title="Analytics" />);
    expect(screen.getByText('Analytics')).toBeInTheDocument();

    rerender(<PageHeader title="Settings" />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});
