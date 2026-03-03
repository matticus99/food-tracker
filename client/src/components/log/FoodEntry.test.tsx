import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FoodEntry from './FoodEntry';

const defaultProps = {
  id: 'entry-1',
  emoji: '🍗',
  name: 'Chicken Breast',
  servingLabel: '100g',
  servings: 1,
  calories: 165,
  onDelete: vi.fn(),
};

describe('FoodEntry', () => {
  it('renders food name and emoji', () => {
    render(<FoodEntry {...defaultProps} />);

    expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
    expect(screen.getByText('🍗')).toBeInTheDocument();
  });

  it('shows default emoji when emoji is null', () => {
    render(<FoodEntry {...defaultProps} emoji={null} />);

    expect(screen.getByText('🍽️')).toBeInTheDocument();
  });

  it('displays calories', () => {
    render(<FoodEntry {...defaultProps} />);

    expect(screen.getByText('165')).toBeInTheDocument();
  });

  it('shows serving multiplier when servings !== 1', () => {
    render(<FoodEntry {...defaultProps} servings={2} />);

    expect(screen.getByText('2\u00d7 100g')).toBeInTheDocument();
  });

  it('hides serving multiplier when servings === 1', () => {
    render(<FoodEntry {...defaultProps} servings={1} />);

    // Should just show '100g' without any multiplier prefix in the serving span
    const servingEl = screen.getByText('100g');
    expect(servingEl).toBeInTheDocument();
    expect(servingEl.textContent).not.toMatch(/\u00d7/);
  });

  it('delete button calls onDelete with correct id', async () => {
    const user = userEvent.setup();
    const handleDelete = vi.fn();
    render(<FoodEntry {...defaultProps} onDelete={handleDelete} />);

    await user.click(screen.getByLabelText('Delete entry'));
    expect(handleDelete).toHaveBeenCalledTimes(1);
    expect(handleDelete).toHaveBeenCalledWith('entry-1');
  });

  it('renders serving label', () => {
    render(<FoodEntry {...defaultProps} servingLabel="1 cup" />);

    expect(screen.getByText('1 cup')).toBeInTheDocument();
  });

  it('rounds calorie display', () => {
    render(<FoodEntry {...defaultProps} calories={165.7} />);

    expect(screen.getByText('166')).toBeInTheDocument();
  });
});
