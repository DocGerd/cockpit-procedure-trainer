import { describe, expect, it } from 'vitest';
import { deviceRegistry } from '../device-registry';
import { unitNames } from './messages';

describe('unit names', () => {
  it.each(deviceRegistry.map((device) => [device.id] as const))(
    '%s has a name in both languages',
    (id) => {
      expect(Object.hasOwn(unitNames.en, id)).toBe(true);
      expect(Object.hasOwn(unitNames.de, id)).toBe(true);
    },
  );
});
