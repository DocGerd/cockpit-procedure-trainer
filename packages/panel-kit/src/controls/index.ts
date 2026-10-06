import type { ControlKind } from '@cpt/core';
import type { ControlWidget } from '../types';
import { CircuitBreaker } from './CircuitBreaker';
import { GuardedHandle } from './GuardedHandle';
import { Lever } from './Lever';
import { PushButton } from './PushButton';
import { Rocker } from './Rocker';
import { KeySwitch, RotaryKnob } from './Rotary';
import { Toggle } from './Toggle';

export { CircuitBreaker, GuardedHandle, KeySwitch, Lever, PushButton, Rocker, RotaryKnob, Toggle };

export const controlWidgets: Readonly<Record<string, ControlWidget>> = {
  toggle: Toggle,
  rocker: Rocker,
  'key-switch': KeySwitch,
  'push-button': PushButton,
  'circuit-breaker': CircuitBreaker,
  'rotary-knob': RotaryKnob,
  lever: Lever,
  'guarded-handle': GuardedHandle,
};

const defaults = {
  toggle: Toggle,
  rotary: RotaryKnob,
  lever: Lever,
  momentary: PushButton,
  guarded: GuardedHandle,
  breaker: CircuitBreaker,
} as const satisfies Record<ControlKind, ControlWidget>;

export function defaultControlWidget(kind: ControlKind): ControlWidget {
  return defaults[kind];
}
