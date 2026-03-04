import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Timeline from './Timeline';

const makeEntry = (
  id: string,
  hour: number,
  name: string,
  overrides?: Partial<{ calories: string; servings: string }>,
) => ({
  id,
  timeHour: hour,
  servings: overrides?.servings ?? '1',
  food: {
    id: `food-${id}`,
    name,
    emoji: null,
    servingLabel: 'per serving',
    servingGrams: null,
    calories: overrides?.calories ?? '200',
    protein: '20',
    fat: '10',
    carbs: '25',
  },
});

describe('Timeline', () => {
  it('renders default meal times (7 AM, 12 PM, 6 PM)', () => {
    render(<Timeline entries={[]} onDelete={vi.fn()} onEdit={vi.fn()} onAddAtHour={vi.fn()} />);

    expect(screen.getByText('7 AM')).toBeInTheDocument();
    expect(screen.getByText('12 PM')).toBeInTheDocument();
    expect(screen.getByText('6 PM')).toBeInTheDocument();
  });

  it('renders food entries at the correct hour', () => {
    const entries = [makeEntry('1', 7, 'Oatmeal')];
    render(<Timeline entries={entries} onDelete={vi.fn()} onEdit={vi.fn()} onAddAtHour={vi.fn()} />);

    expect(screen.getByText('Oatmeal')).toBeInTheDocument();
    expect(screen.getByText('7 AM')).toBeInTheDocument();
  });

  it('renders multiple entries at the same hour', () => {
    const entries = [
      makeEntry('1', 12, 'Chicken Breast'),
      makeEntry('2', 12, 'Rice'),
    ];
    render(<Timeline entries={entries} onDelete={vi.fn()} onEdit={vi.fn()} onAddAtHour={vi.fn()} />);

    expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
    expect(screen.getByText('Rice')).toBeInTheDocument();
  });

  it('renders entries at custom hours outside default range', () => {
    const entries = [makeEntry('1', 8, 'Snack')];
    render(<Timeline entries={entries} onDelete={vi.fn()} onEdit={vi.fn()} onAddAtHour={vi.fn()} />);

    expect(screen.getByText('Snack')).toBeInTheDocument();
    expect(screen.getByText('8 AM')).toBeInTheDocument();
  });

  it('renders add buttons for each time slot', () => {
    render(<Timeline entries={[]} onDelete={vi.fn()} onEdit={vi.fn()} onAddAtHour={vi.fn()} />);

    // Default hours: 7, 12, 18
    expect(screen.getByLabelText('Add food at 7 AM')).toBeInTheDocument();
    expect(screen.getByLabelText('Add food at 12 PM')).toBeInTheDocument();
    expect(screen.getByLabelText('Add food at 6 PM')).toBeInTheDocument();
  });

  it('clicking add button calls onAddAtHour with correct hour', async () => {
    const user = userEvent.setup();
    const handleAdd = vi.fn();
    render(<Timeline entries={[]} onDelete={vi.fn()} onEdit={vi.fn()} onAddAtHour={handleAdd} />);

    await user.click(screen.getByLabelText('Add food at 12 PM'));
    expect(handleAdd).toHaveBeenCalledWith(12);
  });

  it('calls onDelete when entry delete is clicked', async () => {
    const user = userEvent.setup();
    const handleDelete = vi.fn();
    const entries = [makeEntry('entry-42', 7, 'Toast')];
    render(<Timeline entries={entries} onDelete={handleDelete} onEdit={vi.fn()} onAddAtHour={vi.fn()} />);

    await user.click(screen.getByLabelText('Delete entry'));
    expect(handleDelete).toHaveBeenCalledWith('entry-42');
  });

  it('formats hours correctly (12 AM, AM, 12 PM, PM)', () => {
    const entries = [
      makeEntry('1', 5, 'Early Snack'),
      makeEntry('2', 11, 'Brunch'),
      makeEntry('3', 12, 'Lunch'),
      makeEntry('4', 15, 'Afternoon Snack'),
    ];
    render(<Timeline entries={entries} onDelete={vi.fn()} onEdit={vi.fn()} onAddAtHour={vi.fn()} />);

    expect(screen.getByText('5 AM')).toBeInTheDocument();
    expect(screen.getByText('11 AM')).toBeInTheDocument();
    expect(screen.getByText('12 PM')).toBeInTheDocument();
    expect(screen.getByText('3 PM')).toBeInTheDocument();
  });

  it('multiplies calories by servings', () => {
    const entries = [makeEntry('1', 7, 'Eggs', { calories: '100', servings: '3' })];
    render(<Timeline entries={entries} onDelete={vi.fn()} onEdit={vi.fn()} onAddAtHour={vi.fn()} />);

    // 100 * 3 = 300
    expect(screen.getByText('300')).toBeInTheDocument();
  });

  it('renders timeline line element', () => {
    const { container } = render(
      <Timeline entries={[]} onDelete={vi.fn()} onEdit={vi.fn()} onAddAtHour={vi.fn()} />
    );

    const line = container.querySelector('.line');
    expect(line).toBeInTheDocument();
  });
});
