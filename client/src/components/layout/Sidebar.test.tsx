import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../context/ThemeContext';
import Sidebar from './Sidebar';

function renderWithProviders(ui: React.ReactElement, route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ThemeProvider>{ui}</ThemeProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('Sidebar', () => {
  it('renders logo "Fuel"', () => {
    renderWithProviders(<Sidebar />);
    expect(screen.getByText('Fuel')).toBeInTheDocument();
  });

  it('renders all navigation items', () => {
    renderWithProviders(<Sidebar />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Food Log')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('My Foods')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders navigation links with correct hrefs', () => {
    renderWithProviders(<Sidebar />);

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveAttribute('href', '/');

    const logLink = screen.getByText('Food Log').closest('a');
    expect(logLink).toHaveAttribute('href', '/log');

    const analyticsLink = screen.getByText('Analytics').closest('a');
    expect(analyticsLink).toHaveAttribute('href', '/analytics');

    const foodsLink = screen.getByText('My Foods').closest('a');
    expect(foodsLink).toHaveAttribute('href', '/foods');

    const settingsLink = screen.getByText('Settings').closest('a');
    expect(settingsLink).toHaveAttribute('href', '/settings');
  });

  it('highlights active route', () => {
    renderWithProviders(<Sidebar />, '/analytics');

    const analyticsLink = screen.getByText('Analytics').closest('a');
    expect(analyticsLink!.classList.contains('active')).toBe(true);

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink!.classList.contains('active')).toBe(false);
  });

  it('renders "Dark mode" label', () => {
    renderWithProviders(<Sidebar />);
    expect(screen.getByText('Dark mode')).toBeInTheDocument();
  });

  it('renders theme toggle button', () => {
    renderWithProviders(<Sidebar />);
    expect(screen.getByLabelText('Toggle theme')).toBeInTheDocument();
  });

  it('clicking theme toggle switches theme', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Sidebar />);

    const toggle = screen.getByLabelText('Toggle theme');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    await user.click(toggle);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('renders SVG icons for each nav item', () => {
    const { container } = renderWithProviders(<Sidebar />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(5); // 5 nav items
  });
});
