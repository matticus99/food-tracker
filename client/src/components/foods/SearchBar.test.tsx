import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchBar from './SearchBar';

describe('SearchBar', () => {
  it('renders input with placeholder', () => {
    render(<SearchBar value="" onChange={vi.fn()} />);

    expect(screen.getByPlaceholderText('Search foods...')).toBeInTheDocument();
  });

  it('calls onChange when typing', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<SearchBar value="" onChange={handleChange} />);

    const input = screen.getByPlaceholderText('Search foods...');
    await user.type(input, 'chicken');

    // onChange is called for each keystroke
    expect(handleChange).toHaveBeenCalledTimes(7); // c-h-i-c-k-e-n
    expect(handleChange).toHaveBeenCalledWith('c');
  });

  it('shows clear button when value is not empty', () => {
    render(<SearchBar value="chicken" onChange={vi.fn()} />);

    // The clear button has the '×' text
    expect(screen.getByText('\u00d7')).toBeInTheDocument();
  });

  it('does not show clear button when value is empty', () => {
    render(<SearchBar value="" onChange={vi.fn()} />);

    expect(screen.queryByText('\u00d7')).not.toBeInTheDocument();
  });

  it('clear button resets value', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<SearchBar value="chicken" onChange={handleChange} />);

    await user.click(screen.getByText('\u00d7'));
    expect(handleChange).toHaveBeenCalledWith('');
  });

  it('displays the search icon', () => {
    render(<SearchBar value="" onChange={vi.fn()} />);

    expect(screen.getByText('🔍')).toBeInTheDocument();
  });
});
