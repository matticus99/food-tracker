import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MacroCard from './MacroCard';

const defaultProps = {
  protein: 50,
  proteinTarget: 180,
  fat: 30,
  fatTarget: 70,
  carbs: 100,
  carbsTarget: 250,
};

describe('MacroCard', () => {
  it('renders protein, fat, carbs labels', () => {
    render(<MacroCard {...defaultProps} />);

    expect(screen.getByText('Protein')).toBeInTheDocument();
    expect(screen.getByText('Fat')).toBeInTheDocument();
    expect(screen.getByText('Carbs')).toBeInTheDocument();
  });

  it('shows current/target values for protein', () => {
    render(<MacroCard {...defaultProps} />);

    expect(screen.getByText('50g / 180g')).toBeInTheDocument();
  });

  it('shows current/target values for fat', () => {
    render(<MacroCard {...defaultProps} />);

    expect(screen.getByText('30g / 70g')).toBeInTheDocument();
  });

  it('shows current/target values for carbs', () => {
    render(<MacroCard {...defaultProps} />);

    expect(screen.getByText('100g / 250g')).toBeInTheDocument();
  });

  it('handles zero values', () => {
    render(
      <MacroCard
        protein={0}
        proteinTarget={0}
        fat={0}
        fatTarget={0}
        carbs={0}
        carbsTarget={0}
      />
    );

    const zeroValues = screen.getAllByText('0g / 0g');
    expect(zeroValues.length).toBe(3);
  });

  it('applies over-target class when current exceeds target', () => {
    const { container } = render(
      <MacroCard
        protein={200}
        proteinTarget={180}
        fat={80}
        fatTarget={70}
        carbs={100}
        carbsTarget={250}
      />
    );

    const valueSpans = container.querySelectorAll('span[class*="values"]');
    // Protein (200 > 180) and Fat (80 > 70) should have valuesOver class
    expect(valueSpans[0].className).toMatch(/valuesOver/);
    expect(valueSpans[1].className).toMatch(/valuesOver/);
    // Carbs (100 < 250) should not
    expect(valueSpans[2].className).not.toMatch(/valuesOver/);
  });

  it('does not apply over-target class when at or under target', () => {
    const { container } = render(<MacroCard {...defaultProps} />);

    const valueSpans = container.querySelectorAll('span[class*="values"]');
    valueSpans.forEach((span) => {
      expect(span.className).not.toMatch(/valuesOver/);
    });
  });

  it('rounds decimal values', () => {
    render(
      <MacroCard
        protein={50.7}
        proteinTarget={180.3}
        fat={30}
        fatTarget={70}
        carbs={100}
        carbsTarget={250}
      />
    );

    expect(screen.getByText('51g / 180g')).toBeInTheDocument();
  });
});
