import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('renders icon and title', () => {
    render(<EmptyState icon="📋" title="No items found" />);

    expect(screen.getByText('📋')).toBeInTheDocument();
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <EmptyState
        icon="📋"
        title="No items found"
        description="Try adding some foods to get started"
      />
    );

    expect(screen.getByText('Try adding some foods to get started')).toBeInTheDocument();
  });

  it('does not render description when omitted', () => {
    const { container } = render(
      <EmptyState icon="📋" title="No items found" />
    );

    // The desc paragraph should not exist
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(0);
  });

  it('renders action button when provided', () => {
    const handleClick = vi.fn();
    render(
      <EmptyState
        icon="📋"
        title="No items found"
        action={{ label: 'Add Food', onClick: handleClick }}
      />
    );

    expect(screen.getByText('Add Food')).toBeInTheDocument();
  });

  it('action button calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <EmptyState
        icon="📋"
        title="No items found"
        action={{ label: 'Add Food', onClick: handleClick }}
      />
    );

    await user.click(screen.getByText('Add Food'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not render action button when omitted', () => {
    const { container } = render(
      <EmptyState icon="📋" title="No items found" />
    );

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(0);
  });
});
