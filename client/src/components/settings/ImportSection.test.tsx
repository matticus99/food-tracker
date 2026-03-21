import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImportSection from './ImportSection';

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/import/status')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ hasImportedData: false }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ImportSection', () => {
  it('renders import label', () => {
    render(<ImportSection />);
    expect(screen.getByText('Import from MacroFactor')).toBeInTheDocument();
  });

  it('renders hint text', () => {
    render(<ImportSection />);
    expect(screen.getByText('Upload your .xlsx export file')).toBeInTheDocument();
  });

  it('renders "Choose File" button', () => {
    render(<ImportSection />);
    expect(screen.getByText('Choose File')).toBeInTheDocument();
  });

  it('has a hidden file input that accepts .xlsx', () => {
    const { container } = render(<ImportSection />);
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('accept', '.xlsx');
  });

  it('shows "Previously imported data exists." when status has data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/import/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ hasImportedData: true }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      }),
    );

    render(<ImportSection />);

    await waitFor(() => {
      expect(screen.getByText('Previously imported data exists.')).toBeInTheDocument();
    });
  });

  it('does not show previous import status when hasImportedData is false', async () => {
    render(<ImportSection />);

    // Wait for initial API call to resolve
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    expect(screen.queryByText('Previously imported data exists.')).not.toBeInTheDocument();
  });

  it('shows error message when upload fails', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/import/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ hasImportedData: false }),
          });
        }
        if (url.includes('/api/import/macrofactor')) {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ message: 'Invalid file format' }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }),
    );

    const { container } = render(<ImportSection />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test'], 'data.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('Invalid file format')).toBeInTheDocument();
    });
  });

  it('shows import results after successful upload', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/import/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ hasImportedData: false }),
          });
        }
        if (url.includes('/api/import/macrofactor')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                summary: {
                  dailyIntakeCount: 90,
                  weightLogCount: 60,
                  tdeeHistoryCount: 90,
                  favoriteFoodsCount: 15,
                  historyFoodsCount: 45,
                },
              }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }),
    );

    const { container } = render(<ImportSection />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test'], 'export.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('Import Complete')).toBeInTheDocument();
    });
    expect(screen.getByText('90 days of intake')).toBeInTheDocument();
    expect(screen.getByText('60 weight entries')).toBeInTheDocument();
    expect(screen.getByText('90 TDEE entries')).toBeInTheDocument();
    expect(screen.getByText('15 foods with macros')).toBeInTheDocument();
    expect(screen.getByText('45 food names')).toBeInTheDocument();
  });
});
