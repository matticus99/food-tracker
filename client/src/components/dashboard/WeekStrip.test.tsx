import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeekStrip from './WeekStrip';
import { DateProvider } from '../../context/DateContext';

function renderWithDate(ui: React.ReactElement) {
  return render(<DateProvider>{ui}</DateProvider>);
}

describe('WeekStrip', () => {
  it('renders 7 day buttons', () => {
    renderWithDate(<WeekStrip />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(7);
  });

  it('renders day name abbreviations (Mon-Sun)', () => {
    renderWithDate(<WeekStrip />);

    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();
  });

  it('renders day numbers', () => {
    renderWithDate(<WeekStrip />);

    // The current day number should be present
    const today = new Date();
    expect(screen.getByText(String(today.getDate()))).toBeInTheDocument();
  });

  it('selected day has selected class', () => {
    const { container } = renderWithDate(<WeekStrip />);

    const selectedDay = container.querySelector('.selected');
    expect(selectedDay).toBeInTheDocument();
  });

  it('today has today class', () => {
    const { container } = renderWithDate(<WeekStrip />);

    const todayEl = container.querySelector('.today');
    expect(todayEl).toBeInTheDocument();
  });

  it('clicking a day button changes the selected date', async () => {
    const user = userEvent.setup();
    renderWithDate(<WeekStrip />);

    const buttons = screen.getAllByRole('button');
    // Click the first button (Monday of the week)
    await user.click(buttons[0]!);

    // The first button should now be selected
    expect(buttons[0]!.classList.contains('selected')).toBe(true);
  });

  it('shows dots for dates with data', () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]!;
    const datesWithData = new Set([dateStr]);

    const { container } = renderWithDate(<WeekStrip datesWithData={datesWithData} />);

    const dots = container.querySelectorAll('.dot');
    expect(dots.length).toBeGreaterThanOrEqual(1);
  });

  it('does not show dots when no datesWithData', () => {
    const { container } = renderWithDate(<WeekStrip />);

    const dots = container.querySelectorAll('.dot');
    expect(dots.length).toBe(0);
  });
});
