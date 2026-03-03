import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DayNavigator from './DayNavigator';
import { DateProvider } from '../../context/DateContext';

function renderWithDate(ui: React.ReactElement) {
  return render(<DateProvider>{ui}</DateProvider>);
}

describe('DayNavigator', () => {
  it('shows "Today" when date is today', () => {
    renderWithDate(<DayNavigator />);
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('renders previous and next buttons', () => {
    renderWithDate(<DayNavigator />);
    expect(screen.getByLabelText('Previous day')).toBeInTheDocument();
    expect(screen.getByLabelText('Next day')).toBeInTheDocument();
  });

  it('clicking next changes date and shows formatted date', async () => {
    const user = userEvent.setup();
    renderWithDate(<DayNavigator />);

    expect(screen.getByText('Today')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Next day'));

    // After going to tomorrow, "Today" should no longer appear
    expect(screen.queryByText('Today')).not.toBeInTheDocument();
  });

  it('clicking previous shows yesterday formatted date', async () => {
    const user = userEvent.setup();
    renderWithDate(<DayNavigator />);

    await user.click(screen.getByLabelText('Previous day'));

    // After going to yesterday, "Today" should not appear
    expect(screen.queryByText('Today')).not.toBeInTheDocument();
  });

  it('clicking date label returns to today', async () => {
    const user = userEvent.setup();
    renderWithDate(<DayNavigator />);

    // Navigate away
    await user.click(screen.getByLabelText('Previous day'));
    expect(screen.queryByText('Today')).not.toBeInTheDocument();

    // Click the date label (which is the first non-arrow button)
    const buttons = screen.getAllByRole('button');
    const labelButton = buttons.find(
      (btn) => !btn.getAttribute('aria-label')?.includes('day')
    );
    expect(labelButton).toBeDefined();
    await user.click(labelButton!);

    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('renders three buttons (prev, label, next)', () => {
    renderWithDate(<DayNavigator />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(3);
  });
});
