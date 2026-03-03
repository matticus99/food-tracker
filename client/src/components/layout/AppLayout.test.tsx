import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '../../context/ThemeContext';
import AppLayout from './AppLayout';

function renderWithProviders(
  route = '/',
  children: React.ReactElement = <p>Test Page Content</p>,
) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ThemeProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={children} />
            <Route path="/log" element={<p>Log Page</p>} />
            <Route path="/analytics" element={<p>Analytics Page</p>} />
            <Route path="/foods" element={<p>Foods Page</p>} />
            <Route path="/settings" element={<p>Settings Page</p>} />
          </Route>
        </Routes>
      </ThemeProvider>
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

describe('AppLayout', () => {
  it('renders the page content via Outlet', () => {
    renderWithProviders('/');
    expect(screen.getByText('Test Page Content')).toBeInTheDocument();
  });

  it('renders the Sidebar navigation', () => {
    renderWithProviders('/');
    expect(screen.getByText('Fuel')).toBeInTheDocument();
  });

  it('renders the BottomNav navigation', () => {
    renderWithProviders('/');
    // BottomNav uses "Log" while Sidebar uses "Food Log"
    const logLinks = screen.getAllByText('Log');
    expect(logLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('renders main element for content', () => {
    const { container } = renderWithProviders('/');
    const main = container.querySelector('main');
    expect(main).toBeInTheDocument();
  });

  it('renders correct page for /log route', () => {
    renderWithProviders('/log');
    expect(screen.getByText('Log Page')).toBeInTheDocument();
  });

  it('renders correct page for /analytics route', () => {
    renderWithProviders('/analytics');
    expect(screen.getByText('Analytics Page')).toBeInTheDocument();
  });

  it('renders correct page for /foods route', () => {
    renderWithProviders('/foods');
    expect(screen.getByText('Foods Page')).toBeInTheDocument();
  });

  it('renders correct page for /settings route', () => {
    renderWithProviders('/settings');
    expect(screen.getByText('Settings Page')).toBeInTheDocument();
  });

  it('contains shell class wrapper', () => {
    const { container } = renderWithProviders('/');
    const shell = container.querySelector('[class*="shell"]');
    expect(shell).toBeInTheDocument();
  });
});
