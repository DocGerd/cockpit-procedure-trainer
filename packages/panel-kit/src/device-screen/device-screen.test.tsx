// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeviceScreenFrame, DeviceScreenPlaceholder } from './index';

afterEach(cleanup);

describe('DeviceScreenFrame', () => {
  it('draws its screen inside a labelled bezel', () => {
    render(
      <DeviceScreenFrame on label="Radio">
        <button type="button">Key</button>
      </DeviceScreenFrame>,
    );
    const frame = screen.getByRole('group', { name: 'Radio' });
    expect(frame.contains(screen.getByRole('button', { name: 'Key' }))).toBe(true);
    expect(frame.getAttribute('data-on')).toBe('true');
    expect(frame.querySelector('[data-screen-off]')).toBeNull();
  });

  it('darkens the screen while off, without blocking the keys', () => {
    const onClick = vi.fn();
    render(
      <DeviceScreenFrame on={false} label="Radio">
        <button type="button" onClick={onClick}>
          Key
        </button>
      </DeviceScreenFrame>,
    );
    const frame = screen.getByRole('group', { name: 'Radio' });
    expect(frame.getAttribute('data-on')).toBe('false');
    expect(frame.querySelector('[data-screen-off]')?.getAttribute('aria-hidden')).toBe('true');
    screen.getByRole('button', { name: 'Key' }).click();
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('DeviceScreenPlaceholder', () => {
  it('shows its label', () => {
    render(<DeviceScreenPlaceholder label="No screen: com" />);
    expect(screen.getByRole('img', { name: 'No screen: com' }).textContent).toBe('No screen: com');
  });
});
