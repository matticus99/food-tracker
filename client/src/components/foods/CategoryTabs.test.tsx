import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CategoryTabs from './CategoryTabs';

describe('CategoryTabs', () => {
  it('renders "All" tab', () => {
    render(<CategoryTabs active="" onChange={vi.fn()} />);

    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('renders category tabs', () => {
    render(<CategoryTabs active="" onChange={vi.fn()} />);

    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.getByText('Proteins')).toBeInTheDocument();
    expect(screen.getByText('Grains')).toBeInTheDocument();
    expect(screen.getByText('Vegetables')).toBeInTheDocument();
    expect(screen.getByText('Fruits')).toBeInTheDocument();
    expect(screen.getByText('Dairy')).toBeInTheDocument();
    expect(screen.getByText('Snacks')).toBeInTheDocument();
    expect(screen.getByText('Drinks')).toBeInTheDocument();
  });

  it('active tab is highlighted', () => {
    render(<CategoryTabs active="proteins" onChange={vi.fn()} />);

    const proteinsTab = screen.getByText('Proteins');
    expect(proteinsTab.classList.contains('active')).toBe(true);

    const allTab = screen.getByText('All');
    expect(allTab.classList.contains('active')).toBe(false);
  });

  it('All tab is highlighted when active is empty string', () => {
    render(<CategoryTabs active="" onChange={vi.fn()} />);

    const allTab = screen.getByText('All');
    expect(allTab.classList.contains('active')).toBe(true);
  });

  it('clicking tab calls onChange with category value', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<CategoryTabs active="" onChange={handleChange} />);

    await user.click(screen.getByText('Proteins'));
    expect(handleChange).toHaveBeenCalledWith('proteins');
  });

  it('clicking All tab calls onChange with empty string', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<CategoryTabs active="proteins" onChange={handleChange} />);

    await user.click(screen.getByText('All'));
    expect(handleChange).toHaveBeenCalledWith('');
  });
});
