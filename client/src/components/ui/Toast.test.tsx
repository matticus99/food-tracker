import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';

function TestComponent({ message, type }: { message: string; type?: 'success' | 'error' | 'info' }) {
  const { toast } = useToast();
  return (
    <button onClick={() => toast(message, type)}>
      Trigger Toast
    </button>
  );
}

function MultiToastComponent() {
  const { toast } = useToast();
  return (
    <>
      <button onClick={() => toast('First toast', 'success')}>Toast 1</button>
      <button onClick={() => toast('Second toast', 'error')}>Toast 2</button>
    </>
  );
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders message when triggered', () => {
    render(
      <ToastProvider>
        <TestComponent message="Operation successful" />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Trigger Toast'));
    expect(screen.getByText('Operation successful')).toBeInTheDocument();
  });

  it('renders with success icon', () => {
    render(
      <ToastProvider>
        <TestComponent message="Saved!" type="success" />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Trigger Toast'));
    expect(screen.getByText('Saved!')).toBeInTheDocument();
    expect(screen.getByText('\u2713')).toBeInTheDocument();
  });

  it('renders with error icon', () => {
    render(
      <ToastProvider>
        <TestComponent message="Failed!" type="error" />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Trigger Toast'));
    expect(screen.getByText('Failed!')).toBeInTheDocument();
    expect(screen.getByText('\u2715')).toBeInTheDocument();
  });

  it('auto-dismisses after timeout', () => {
    render(
      <ToastProvider>
        <TestComponent message="Disappearing toast" />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Trigger Toast'));
    expect(screen.getByText('Disappearing toast')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByText('Disappearing toast')).not.toBeInTheDocument();
  });

  it('can be dismissed by clicking', () => {
    render(
      <ToastProvider>
        <TestComponent message="Click to dismiss" />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Trigger Toast'));
    expect(screen.getByText('Click to dismiss')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Click to dismiss'));
    expect(screen.queryByText('Click to dismiss')).not.toBeInTheDocument();
  });

  it('multiple toasts can display simultaneously', () => {
    render(
      <ToastProvider>
        <MultiToastComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Toast 1'));
    fireEvent.click(screen.getByText('Toast 2'));

    expect(screen.getByText('First toast')).toBeInTheDocument();
    expect(screen.getByText('Second toast')).toBeInTheDocument();
  });

  it('useToast throws when used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useToast());
    }).toThrow('useToast must be used within ToastProvider');
    consoleSpy.mockRestore();
  });
});
