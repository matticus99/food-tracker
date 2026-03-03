import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PeriodSelector from './PeriodSelector';

describe('PeriodSelector', () => {
  it('renders period buttons', () => {
    render(
      <PeriodSelector periods={[7, 14, 30]} active={7} onChange={vi.fn()} />
    );

    expect(screen.getByText('7d')).toBeInTheDocument();
    expect(screen.getByText('14d')).toBeInTheDocument();
    expect(screen.getByText('30d')).toBeInTheDocument();
  });

  it('active period is highlighted', () => {
    render(
      <PeriodSelector periods={[7, 14, 30]} active={14} onChange={vi.fn()} />
    );

    const activeBtn = screen.getByText('14d');
    expect(activeBtn.classList.contains('active')).toBe(true);

    const inactiveBtn = screen.getByText('7d');
    expect(inactiveBtn.classList.contains('active')).toBe(false);
  });

  it('clicking period calls onChange with the period number', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <PeriodSelector periods={[7, 14, 30]} active={7} onChange={handleChange} />
    );

    await user.click(screen.getByText('30d'));
    expect(handleChange).toHaveBeenCalledWith(30);
  });

  it('clicking already active period still calls onChange', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <PeriodSelector periods={[7, 14, 30]} active={7} onChange={handleChange} />
    );

    await user.click(screen.getByText('7d'));
    expect(handleChange).toHaveBeenCalledWith(7);
  });

  it('renders correct number of buttons', () => {
    const { container } = render(
      <PeriodSelector periods={[7, 14, 30, 90]} active={7} onChange={vi.fn()} />
    );

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(4);
  });
});
