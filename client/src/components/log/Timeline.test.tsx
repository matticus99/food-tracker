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
  it('hides cards with no entries', () => {
    render(<Timeline entries={[]} onDelete={vi.fn()} onEdit={vi.fn()} onAddAtHour={vi.fn()} />);

    expect(screen.queryByText('Morning')).not.toBeInTheDocument();
    expect(screen.queryByText('Midday')).not.toBeInTheDocument();
    expect(screen.queryByText('Evening')).not.toBeInTheDocument();
  });

  it('shows card for time block with entries', () => {
    const entries = [makeEntry('1', 7, 'Oatmeal')];
    render(<Timeline entries={entries} onDelete={vi.fn()} onEdit={vi.fn()} onAddAtHour={vi.fn()} />);

    expect(screen.getByText('Morning')).toBeInTheDocument();
    expect(screen.getByText('Oatmeal')).toBeInTheDocument();
  });

  it('groups entries into correct time blocks', () => {
    const entries = [
      makeEntry('1', 6, 'Cereal'),       // Morning (5-10)
      makeEntry('2', 11, 'Brunch'),       // Midday (10-13)
      makeEntry('3', 18, 'Dinner'),       // Evening (17-21)
    ];
    render(<Timeline entries={entries} onDelete={vi.fn()} onEdit={vi.fn()} onAddAtHour={vi.fn()} />);

    expect(screen.getByText('Morning')).toBeInTheDocument();
    expect(screen.getByText('Midday')).toBeInTheDocument();
    expect(screen.getByText('Evening')).toBeInTheDocument();
    expect(screen.queryByText('Afternoon')).not.toBeInTheDocument();
  });

  it('renders multiple entries in the same card', () => {
    const entries = [
      makeEntry('1', 12, 'Chicken Breast'),
      makeEntry('2', 12, 'Rice'),
    ];
    render(<Timeline entries={entries} onDelete={vi.fn()} onEdit={vi.fn()} onAddAtHour={vi.fn()} />);

    expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
    expect(screen.getByText('Rice')).toBeInTheDocument();
  });

  it('shows calorie subtotal per card', () => {
    const entries = [
      makeEntry('1', 7, 'Eggs', { calories: '100', servings: '2' }),
      makeEntry('2', 8, 'Toast', { calories: '150', servings: '1' }),
    ];
    render(<Timeline entries={entries} onDelete={vi.fn()} onEdit={vi.fn()} onAddAtHour={vi.fn()} />);

    // 100*2 + 150*1 = 350
    expect(screen.getByText('350')).toBeInTheDocument();
  });

  it('renders add button per card', () => {
    const entries = [makeEntry('1', 7, 'Oatmeal')];
    render(<Timeline entries={entries} onDelete={vi.fn()} onEdit={vi.fn()} onAddAtHour={vi.fn()} />);

    expect(screen.getByLabelText('Add food to Morning')).toBeInTheDocument();
  });

  it('clicking add button calls onAddAtHour', async () => {
    const user = userEvent.setup();
    const handleAdd = vi.fn();
    const entries = [makeEntry('1', 11, 'Lunch')];
    render(<Timeline entries={entries} onDelete={vi.fn()} onEdit={vi.fn()} onAddAtHour={handleAdd} />);

    await user.click(screen.getByLabelText('Add food to Midday'));
    expect(handleAdd).toHaveBeenCalled();
  });

  it('calls onDelete when entry delete is clicked', async () => {
    const user = userEvent.setup();
    const handleDelete = vi.fn();
    const entries = [makeEntry('entry-42', 7, 'Toast')];
    render(<Timeline entries={entries} onDelete={handleDelete} onEdit={vi.fn()} onAddAtHour={vi.fn()} />);

    await user.click(screen.getByLabelText('Delete entry'));
    expect(handleDelete).toHaveBeenCalledWith('entry-42');
  });

  it('multiplies calories by servings in subtotal', () => {
    const entries = [makeEntry('1', 7, 'Eggs', { calories: '100', servings: '3' })];
    render(<Timeline entries={entries} onDelete={vi.fn()} onEdit={vi.fn()} onAddAtHour={vi.fn()} />);

    // 100 * 3 = 300 appears in both entry and card subtotal
    const matches = screen.getAllByText('300');
    expect(matches.length).toBe(2);
  });

  it('maps early morning hours (0-4) to Early Morning card', () => {
    const entries = [makeEntry('1', 2, 'Late Snack')];
    render(<Timeline entries={entries} onDelete={vi.fn()} onEdit={vi.fn()} onAddAtHour={vi.fn()} />);

    expect(screen.getByText('Early Morning')).toBeInTheDocument();
  });

  it('maps night hours (21-23) to Night card', () => {
    const entries = [makeEntry('1', 22, 'Midnight Snack')];
    render(<Timeline entries={entries} onDelete={vi.fn()} onEdit={vi.fn()} onAddAtHour={vi.fn()} />);

    expect(screen.getByText('Night')).toBeInTheDocument();
  });
});
