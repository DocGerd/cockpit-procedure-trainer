import { describe, expect, it } from 'vitest';
import { aircraftRegistry } from '../aircraft-registry';
import { kindLabel } from './ControlDetails';
import { messages } from './messages';

const control = (aircraftId: string, controlId: string) => {
  const found = aircraftRegistry.find(({ id }) => id === aircraftId)?.controls[controlId];
  if (!found) throw new Error(`no control ${aircraftId}/${controlId}`);
  return found;
};

describe('control kind label', () => {
  it('calls a momentary control drawn as a lever a spring-return lever', () => {
    expect(kindLabel(messages.en, control('ctsl', 'brake'))).toBe('Lever, springs back');
    expect(kindLabel(messages.de, control('ctsl', 'brake'))).toBe('Hebel, federt zurück');
  });

  it('keeps calling a momentary push button momentary', () => {
    expect(kindLabel(messages.en, control('demo', 'starter'))).toBe('Momentary');
    expect(kindLabel(messages.de, control('demo', 'starter'))).toBe('Taster');
  });
});
