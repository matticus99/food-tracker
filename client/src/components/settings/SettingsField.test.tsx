import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsField from './SettingsField';

describe('SettingsField', () => {
  it('renders label', () => {
    render(
      <SettingsField label="Height">
        <input type="number" />
      </SettingsField>
    );

    expect(screen.getByText('Height')).toBeInTheDocument();
  });

  it('renders children (input)', () => {
    render(
      <SettingsField label="Weight">
        <input type="number" placeholder="Enter weight" />
      </SettingsField>
    );

    expect(screen.getByPlaceholderText('Enter weight')).toBeInTheDocument();
  });

  it('renders suffix when provided', () => {
    render(
      <SettingsField label="Height" suffix="inches">
        <input type="number" />
      </SettingsField>
    );

    expect(screen.getByText('inches')).toBeInTheDocument();
  });

  it('does not render suffix when not provided', () => {
    const { container } = render(
      <SettingsField label="Name">
        <input type="text" />
      </SettingsField>
    );

    const suffixes = container.querySelectorAll('[class*="suffix"]');
    expect(suffixes.length).toBe(0);
  });

  it('renders label as <label> element', () => {
    render(
      <SettingsField label="Age">
        <input type="number" />
      </SettingsField>
    );

    const label = screen.getByText('Age');
    expect(label.tagName).toBe('LABEL');
  });

  it('children are interactive', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <SettingsField label="Name">
        <input type="text" onChange={handleChange} />
      </SettingsField>
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'test');
    expect(handleChange).toHaveBeenCalled();
  });

  it('renders select as child', () => {
    render(
      <SettingsField label="Sex">
        <select defaultValue="male">
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </SettingsField>
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
