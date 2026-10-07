// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { deviceEntries, deviceRegistry } from './device-registry';

afterEach(cleanup);

// A Guided step rings the key whose `data-control` (and `data-position`) matches its target.
describe.each(deviceRegistry.map((device) => [device.id, device] as const))(
  'the %s screen keys',
  (id, device) => {
    const entry = deviceEntries[id];
    if (!entry) throw new Error(`No screen entry for ${id}`);
    const { Screen } = entry;
    const keys = () => {
      const { container } = render(<Screen on state={device.initial} send={vi.fn()} />);
      return [...container.querySelectorAll<HTMLElement>('button, input')];
    };

    it('carry the id of the device control they operate', () => {
      for (const key of keys()) {
        expect(Object.keys(device.controls), key.outerHTML).toContain(key.dataset.control);
      }
    });

    it('cover every control of the device', () => {
      const covered = new Set(keys().map((key) => key.dataset.control));
      expect([...covered].sort()).toEqual(Object.keys(device.controls).sort());
    });

    it('name only positions their control has', () => {
      for (const key of keys()) {
        const position = key.dataset.position;
        if (position === undefined) continue;
        const control = device.controls[key.dataset.control ?? ''];
        expect(control?.positions, key.outerHTML).toContain(position);
      }
    });
  },
);
