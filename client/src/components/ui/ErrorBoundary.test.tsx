import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from './ErrorBoundary';

function GoodChild() {
  return <div>Everything is fine</div>;
}

function BrokenChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test explosion');
  }
  return <div>Child is working</div>;
}

// Stateful wrapper to toggle the error on/off from outside
function ErrorToggler() {
  return <BrokenChild shouldThrow={true} />;
}

describe('ErrorBoundary', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress React's default error boundary console output and our own
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('Everything is fine')).toBeInTheDocument();
  });

  it('shows error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ErrorToggler />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.queryByText('Child is working')).not.toBeInTheDocument();
  });

  it('shows generic error message (does not leak internal error details)', () => {
    render(
      <ErrorBoundary>
        <ErrorToggler />
      </ErrorBoundary>
    );

    expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
    // Verify the raw error message is NOT shown to the user
    expect(screen.queryByText('Test explosion')).not.toBeInTheDocument();
  });

  it('retry button resets error state', async () => {
    const user = userEvent.setup();

    // We need a component that can stop throwing after retry
    let shouldThrow = true;
    function ConditionalError() {
      if (shouldThrow) throw new Error('Temporary error');
      return <div>Recovered</div>;
    }

    render(
      <ErrorBoundary>
        <ConditionalError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Stop throwing before retry
    shouldThrow = false;

    await user.click(screen.getByText('Try Again'));

    expect(screen.getByText('Recovered')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('console.error is called with error info', () => {
    render(
      <ErrorBoundary>
        <ErrorToggler />
      </ErrorBoundary>
    );

    expect(consoleSpy).toHaveBeenCalled();
    // Our componentDidCatch logs 'ErrorBoundary caught:'
    const calls = consoleSpy.mock.calls;
    const boundaryCall = calls.find(
      (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('ErrorBoundary caught:')
    );
    expect(boundaryCall).toBeDefined();
  });
});
