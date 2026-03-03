import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FoodDbList from './FoodDbList';

const makeFoods = (count = 2) =>
  Array.from({ length: count }, (_, i) => ({
    id: `food-${i}`,
    name: `Food ${i}`,
    emoji: i === 0 ? '\ud83c\udf57' : null,
    category: 'proteins',
    servingLabel: '100g',
    servingGrams: '100',
    calories: i === 0 ? '200' : null,
    protein: i === 0 ? '25' : null,
    fat: i === 0 ? '10' : null,
    carbs: i === 0 ? '5' : null,
    source: i === 1 ? 'imported_history' : 'manual',
  }));

describe('FoodDbList', () => {
  it('renders food items', () => {
    const foods = makeFoods();
    render(
      <FoodDbList
        foods={foods}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onAdd={vi.fn()}
      />
    );

    expect(screen.getByText('Food 0')).toBeInTheDocument();
    expect(screen.getByText('Food 1')).toBeInTheDocument();
  });

  it('renders emoji for foods with emoji', () => {
    const foods = makeFoods(1);
    render(
      <FoodDbList foods={foods} onEdit={vi.fn()} onDelete={vi.fn()} onAdd={vi.fn()} />
    );

    expect(screen.getByText('\ud83c\udf57')).toBeInTheDocument();
  });

  it('renders default emoji when food has no emoji', () => {
    const foods = [{ ...makeFoods(1)[0]!, emoji: null }];
    render(
      <FoodDbList foods={foods} onEdit={vi.fn()} onDelete={vi.fn()} onAdd={vi.fn()} />
    );

    expect(screen.getByText('\ud83c\udf7d\ufe0f')).toBeInTheDocument();
  });

  it('renders serving label', () => {
    const foods = makeFoods(1);
    render(
      <FoodDbList foods={foods} onEdit={vi.fn()} onDelete={vi.fn()} onAdd={vi.fn()} />
    );

    expect(screen.getByText('100g')).toBeInTheDocument();
  });

  it('renders macro values for foods with macros', () => {
    const foods = makeFoods(1);
    render(
      <FoodDbList foods={foods} onEdit={vi.fn()} onDelete={vi.fn()} onAdd={vi.fn()} />
    );

    expect(screen.getByText('200')).toBeInTheDocument(); // calories
    expect(screen.getByText('25')).toBeInTheDocument(); // protein
    expect(screen.getByText('10')).toBeInTheDocument(); // fat
    expect(screen.getByText('5')).toBeInTheDocument(); // carbs
  });

  it('renders dashes for foods without macros', () => {
    const foods = makeFoods(2);
    render(
      <FoodDbList foods={foods} onEdit={vi.fn()} onDelete={vi.fn()} onAdd={vi.fn()} />
    );

    // Food 1 has no macros, should show dashes
    const dashes = screen.getAllByText('\u2014');
    expect(dashes.length).toBe(4); // cal, protein, fat, carbs
  });

  it('shows "needs macros" badge for imported_history foods without calories', () => {
    const foods = makeFoods(2);
    render(
      <FoodDbList foods={foods} onEdit={vi.fn()} onDelete={vi.fn()} onAdd={vi.fn()} />
    );

    expect(screen.getByText('needs macros')).toBeInTheDocument();
  });

  it('clicking food item calls onEdit', async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();
    const foods = makeFoods(1);
    render(
      <FoodDbList foods={foods} onEdit={handleEdit} onDelete={vi.fn()} onAdd={vi.fn()} />
    );

    await user.click(screen.getByText('Food 0'));
    expect(handleEdit).toHaveBeenCalledWith(foods[0]);
  });

  it('clicking delete button calls onDelete with food id', async () => {
    const user = userEvent.setup();
    const handleDelete = vi.fn();
    const foods = makeFoods(1);
    render(
      <FoodDbList foods={foods} onEdit={vi.fn()} onDelete={handleDelete} onAdd={vi.fn()} />
    );

    await user.click(screen.getByLabelText('Delete food'));
    expect(handleDelete).toHaveBeenCalledWith('food-0');
  });

  it('delete button does not trigger onEdit (stopPropagation)', async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();
    const foods = makeFoods(1);
    render(
      <FoodDbList foods={foods} onEdit={handleEdit} onDelete={handleDelete} onAdd={vi.fn()} />
    );

    await user.click(screen.getByLabelText('Delete food'));
    expect(handleDelete).toHaveBeenCalled();
    expect(handleEdit).not.toHaveBeenCalled();
  });

  it('renders "Add New Food" button', () => {
    render(
      <FoodDbList foods={[]} onEdit={vi.fn()} onDelete={vi.fn()} onAdd={vi.fn()} />
    );

    expect(screen.getByText('+ Add New Food')).toBeInTheDocument();
  });

  it('clicking "Add New Food" calls onAdd', async () => {
    const user = userEvent.setup();
    const handleAdd = vi.fn();
    render(
      <FoodDbList foods={[]} onEdit={vi.fn()} onDelete={vi.fn()} onAdd={handleAdd} />
    );

    await user.click(screen.getByText('+ Add New Food'));
    expect(handleAdd).toHaveBeenCalledTimes(1);
  });

  it('rounds macro values for display', () => {
    const foods = [{
      id: 'f1',
      name: 'Food',
      emoji: null,
      category: 'other',
      servingLabel: '100g',
      servingGrams: null,
      calories: '200.7',
      protein: '25.3',
      fat: '10.8',
      carbs: '5.2',
      source: 'manual',
    }];
    render(
      <FoodDbList foods={foods} onEdit={vi.fn()} onDelete={vi.fn()} onAdd={vi.fn()} />
    );

    expect(screen.getByText('201')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
