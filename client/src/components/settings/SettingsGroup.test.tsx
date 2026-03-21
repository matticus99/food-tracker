import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SettingsGroup from './SettingsGroup';

describe('SettingsGroup', () => {
  it('renders title', () => {
    render(
      <SettingsGroup title="Profile">
        <p>Content</p>
      </SettingsGroup>
    );

    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <SettingsGroup title="Profile">
        <p>Child content here</p>
      </SettingsGroup>
    );

    expect(screen.getByText('Child content here')).toBeInTheDocument();
  });

  it('renders title as h3 element', () => {
    render(
      <SettingsGroup title="My Settings">
        <div />
      </SettingsGroup>
    );

    const heading = screen.getByText('My Settings');
    expect(heading.tagName).toBe('H3');
  });

  it('renders multiple children', () => {
    render(
      <SettingsGroup title="Goals">
        <p>First child</p>
        <p>Second child</p>
        <p>Third child</p>
      </SettingsGroup>
    );

    expect(screen.getByText('First child')).toBeInTheDocument();
    expect(screen.getByText('Second child')).toBeInTheDocument();
    expect(screen.getByText('Third child')).toBeInTheDocument();
  });

  it('wraps content in a container div', () => {
    const { container } = render(
      <SettingsGroup title="Test">
        <span>Inner</span>
      </SettingsGroup>
    );

    // Should have group container > title + content wrapper
    const group = container.firstChild as HTMLElement;
    expect(group).toBeInTheDocument();
    expect(group.children.length).toBe(2); // h3 + content div
  });
});
