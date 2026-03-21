import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DataExportImportSection from './DataExportImportSection';

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  vi.stubGlobal('URL', {
    ...globalThis.URL,
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockExportSuccess() {
  (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    blob: () => Promise.resolve(new Blob(['{}'], { type: 'application/json' })),
  });
}

function mockExportError(errorMsg: string) {
  (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: false,
    status: 500,
    json: () => Promise.resolve({ error: errorMsg }),
  });
}

function mockImportSuccess(summary: Record<string, unknown>) {
  (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ summary }),
  });
}

function mockImportError(errorMsg: string) {
  (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: false,
    status: 400,
    json: () => Promise.resolve({ error: errorMsg }),
  });
}

const defaultSummary = {
  userUpdated: false,
  foodsInserted: 5,
  foodsSkipped: 0,
  foodLogInserted: 20,
  foodLogSkipped: 0,
  weightInserted: 10,
  weightUpdated: 0,
  importedIntakeDays: 0,
};

async function uploadJsonFile(container: HTMLElement) {
  const user = userEvent.setup();
  const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(['{}'], 'export.json', { type: 'application/json' });
  await user.upload(fileInput, file);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('DataExportImportSection', () => {
  // ── Rendering ──

  it('renders export label and Download button', () => {
    render(<DataExportImportSection />);
    expect(screen.getByText('Export All Data')).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
  });

  it('renders import label and Choose File button', () => {
    render(<DataExportImportSection />);
    expect(screen.getByText('Import Data')).toBeInTheDocument();
    expect(screen.getByText('Choose File')).toBeInTheDocument();
  });

  it('has a hidden file input that accepts .json', () => {
    const { container } = render(<DataExportImportSection />);
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('accept', '.json');
  });

  // ── Export ──

  it('shows success message after successful export', async () => {
    const user = userEvent.setup();
    mockExportSuccess();
    render(<DataExportImportSection />);

    await user.click(screen.getByText('Download'));

    await waitFor(() => {
      expect(screen.getByText('Export downloaded successfully.')).toBeInTheDocument();
    });
  });

  it('shows error message when export fails with server error', async () => {
    const user = userEvent.setup();
    mockExportError('Database connection failed');
    render(<DataExportImportSection />);

    await user.click(screen.getByText('Download'));

    await waitFor(() => {
      expect(screen.getByText('Database connection failed')).toBeInTheDocument();
    });
  });

  it('shows generic error when export response has no JSON body', async () => {
    const user = userEvent.setup();
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('no json')),
    });
    render(<DataExportImportSection />);

    await user.click(screen.getByText('Download'));

    await waitFor(() => {
      expect(screen.getByText('Export failed (500)')).toBeInTheDocument();
    });
  });

  // ── Import ──

  it('shows import results after successful upload', async () => {
    mockImportSuccess(defaultSummary);
    const { container } = render(<DataExportImportSection />);

    await uploadJsonFile(container);

    await waitFor(() => {
      expect(screen.getByText('Import Complete')).toBeInTheDocument();
    });
    expect(screen.getByText(/5 foods added/)).toBeInTheDocument();
    expect(screen.getByText(/20 food log entries/)).toBeInTheDocument();
    expect(screen.getByText(/10 weight entries/)).toBeInTheDocument();
  });

  it('shows duplicate/skip counts when present', async () => {
    mockImportSuccess({
      ...defaultSummary,
      foodsSkipped: 3,
      foodLogSkipped: 7,
      weightUpdated: 2,
    });
    const { container } = render(<DataExportImportSection />);

    await uploadJsonFile(container);

    await waitFor(() => {
      expect(screen.getByText('Import Complete')).toBeInTheDocument();
    });
    expect(screen.getByText(/3 duplicates skipped/)).toBeInTheDocument();
    expect(screen.getByText(/7 skipped/)).toBeInTheDocument();
    expect(screen.getByText(/2 updated/)).toBeInTheDocument();
  });

  it('shows "Profile settings updated" when userUpdated is true', async () => {
    mockImportSuccess({ ...defaultSummary, userUpdated: true });
    const { container } = render(<DataExportImportSection />);

    await uploadJsonFile(container);

    await waitFor(() => {
      expect(screen.getByText('Profile settings updated')).toBeInTheDocument();
    });
  });

  it('shows imported intake days when count > 0', async () => {
    mockImportSuccess({ ...defaultSummary, importedIntakeDays: 90 });
    const { container } = render(<DataExportImportSection />);

    await uploadJsonFile(container);

    await waitFor(() => {
      expect(screen.getByText(/90 imported intake days/)).toBeInTheDocument();
    });
  });

  it('shows error message when import fails', async () => {
    mockImportError('Invalid file format');
    const { container } = render(<DataExportImportSection />);

    await uploadJsonFile(container);

    await waitFor(() => {
      expect(screen.getByText('Invalid file format')).toBeInTheDocument();
    });
  });
});
