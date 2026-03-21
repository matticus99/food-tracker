import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BottomNav from './BottomNav';

function renderWithRouter(ui: React.ReactElement, route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>,
  );
}

describe('BottomNav', () => {
  it('renders all navigation items', () => {
    renderWithRouter(<BottomNav />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Log')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Foods')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders navigation links with correct hrefs', () => {
    renderWithRouter(<BottomNav />);

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveAttribute('href', '/');

    const logLink = screen.getByText('Log').closest('a');
    expect(logLink).toHaveAttribute('href', '/log');

    const analyticsLink = screen.getByText('Analytics').closest('a');
    expect(analyticsLink).toHaveAttribute('href', '/analytics');

    const foodsLink = screen.getByText('Foods').closest('a');
    expect(foodsLink).toHaveAttribute('href', '/foods');

    const settingsLink = screen.getByText('Settings').closest('a');
    expect(settingsLink).toHaveAttribute('href', '/settings');
  });

  it('highlights active route', () => {
    renderWithRouter(<BottomNav />, '/log');

    const logLink = screen.getByText('Log').closest('a');
    expect(logLink!.classList.contains('active')).toBe(true);

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink!.classList.contains('active')).toBe(false);
  });

  it('highlights Dashboard when at root route', () => {
    renderWithRouter(<BottomNav />, '/');

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink!.classList.contains('active')).toBe(true);
  });

  it('renders as nav element', () => {
    const { container } = renderWithRouter(<BottomNav />);
    const nav = container.querySelector('nav');
    expect(nav).toBeInTheDocument();
  });

  it('renders 5 navigation links', () => {
    renderWithRouter(<BottomNav />);

    const links = screen.getAllByRole('link');
    expect(links.length).toBe(5);
  });

  it('renders SVG icons for each nav item', () => {
    const { container } = renderWithRouter(<BottomNav />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(5);
  });
});
