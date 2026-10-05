import type { ControlDefinition, ControlPosition } from '@cpt/core';
import { vi } from 'vitest';
import type { ControlWidgetProps } from '../types';

const text = { de: 'Kontrolle', en: 'Control' };

export const toggle3 = {
  kind: 'toggle',
  name: text,
  description: text,
  positions: ['low', 'middle', 'high'],
  initial: 'low',
} as const satisfies ControlDefinition;

export const toggle2 = {
  kind: 'toggle',
  name: text,
  description: text,
  positions: ['off', 'on'],
  initial: 'off',
} as const satisfies ControlDefinition;

export const rotary = {
  kind: 'rotary',
  name: text,
  description: text,
  positions: ['off', 'left', 'right', 'both', 'start'],
  initial: 'off',
  springBack: { start: 'both' },
} as const satisfies ControlDefinition;

export const momentary = {
  kind: 'momentary',
  name: text,
  description: text,
  positions: ['released', 'held'],
  initial: 'released',
} as const satisfies ControlDefinition;

export const breaker = {
  kind: 'breaker',
  name: text,
  description: text,
  positions: ['in', 'pulled'],
  initial: 'in',
} as const satisfies ControlDefinition;

export const guarded = {
  kind: 'guarded',
  name: text,
  description: text,
  positions: ['stowed', 'pulled'],
  initial: 'stowed',
  guard: { name: text },
} as const satisfies ControlDefinition;

export const continuousLever = {
  kind: 'lever',
  name: text,
  description: text,
  positions: 'continuous',
  initial: 0,
} as const satisfies ControlDefinition;

export const notchedLever = {
  kind: 'lever',
  name: text,
  description: text,
  positions: ['up', 'ten', 'twenty', 'full'],
  initial: 'up',
} as const satisfies ControlDefinition;

export function labelsFor(control: ControlDefinition): Record<string, string> {
  const ids = control.positions === 'continuous' ? [] : control.positions;
  return Object.fromEntries(ids.map((id) => [id, `label ${id}`]));
}

type Overrides = Partial<
  Pick<ControlWidgetProps, 'position' | 'guardOpen' | 'label' | 'positionLabels'>
>;

export function widgetProps(control: ControlDefinition, overrides: Overrides = {}) {
  return {
    control,
    position: control.initial,
    guardOpen: false,
    label: 'The control',
    positionLabels: labelsFor(control),
    onSet: vi.fn<(position: ControlPosition) => void>(),
    onPress: vi.fn<(position?: ControlPosition) => void>(),
    onRelease: vi.fn<() => void>(),
    onOpenGuard: vi.fn<() => void>(),
    onCloseGuard: vi.fn<() => void>(),
    ...overrides,
  } satisfies ControlWidgetProps;
}
