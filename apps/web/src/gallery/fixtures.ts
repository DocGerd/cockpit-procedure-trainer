import type {
  ControlDefinition,
  ControlPosition,
  IndicatorValue,
  JsonObject,
  Text,
} from '@cpt/core';

const text = (name: string): Text => ({ de: name, en: name });

export type ControlFixture = {
  id: string;
  widget: string;
  title: string;
  control: ControlDefinition;
  labels: Readonly<Record<string, string>>;
};

export const CONTINUOUS_SAMPLES: readonly number[] = [0, 0.25, 0.5, 0.75, 1];

export function samplesOf(control: ControlDefinition): readonly ControlPosition[] {
  return control.positions === 'continuous' ? CONTINUOUS_SAMPLES : control.positions;
}

const base = (name: string) => ({ name: text(name), description: text(name) });

export const controlFixtures: readonly ControlFixture[] = [
  {
    id: 'toggle-two',
    widget: 'toggle',
    title: 'Two-position toggle',
    control: { ...base('Master'), kind: 'toggle', positions: ['off', 'on'], initial: 'off' },
    labels: { off: 'Off', on: 'On' },
  },
  {
    id: 'toggle-three',
    widget: 'toggle',
    title: 'Three-position toggle',
    control: {
      ...base('Pump'),
      kind: 'toggle',
      positions: ['off', 'low', 'high'],
      initial: 'off',
    },
    labels: { off: 'Off', low: 'Low', high: 'High' },
  },
  {
    id: 'rocker-three',
    widget: 'rocker',
    title: 'Three-position rocker',
    control: {
      ...base('Lights'),
      kind: 'toggle',
      positions: ['left', 'off', 'right'],
      initial: 'off',
    },
    labels: { left: 'Left', off: 'Off', right: 'Right' },
  },
  {
    id: 'key-switch-spring',
    widget: 'key-switch',
    title: 'Key switch with spring-back start',
    control: {
      ...base('Ignition'),
      kind: 'rotary',
      positions: ['off', 'left', 'right', 'both', 'start'],
      initial: 'off',
      springBack: { start: 'both' },
    },
    labels: { off: 'Off', left: 'Left', right: 'Right', both: 'Both', start: 'Start' },
  },
  {
    id: 'push-button',
    widget: 'push-button',
    title: 'Momentary push button',
    control: {
      ...base('Test'),
      kind: 'momentary',
      positions: ['released', 'held'],
      initial: 'released',
    },
    labels: { released: 'Released', held: 'Held' },
  },
  {
    id: 'circuit-breaker',
    widget: 'circuit-breaker',
    title: 'Circuit breaker',
    control: { ...base('Avionics'), kind: 'breaker', positions: ['in', 'pulled'], initial: 'in' },
    labels: { in: 'In', pulled: 'Pulled' },
  },
  {
    id: 'rotary-knob',
    widget: 'rotary-knob',
    title: 'Rotary knob',
    control: {
      ...base('Fuel selector'),
      kind: 'rotary',
      positions: ['off', 'left', 'both', 'right'],
      initial: 'both',
    },
    labels: { off: 'Off', left: 'Left', both: 'Both', right: 'Right' },
  },
  {
    id: 'lever-notched',
    widget: 'lever',
    title: 'Lever with notches',
    control: {
      ...base('Flaps'),
      kind: 'lever',
      positions: ['up', 'ten', 'twenty', 'full'],
      initial: 'up',
    },
    labels: { up: 'Up', ten: '10', twenty: '20', full: 'Full' },
  },
  {
    id: 'lever-continuous',
    widget: 'lever',
    title: 'Continuous lever',
    control: { ...base('Throttle'), kind: 'lever', positions: 'continuous', initial: 0 },
    labels: {},
  },
  {
    id: 'guarded-handle',
    widget: 'guarded-handle',
    title: 'Guarded handle',
    control: {
      ...base('Fire handle'),
      kind: 'guarded',
      positions: ['stowed', 'pulled'],
      initial: 'stowed',
      guard: { name: text('Guard') },
    },
    labels: { stowed: 'Stowed', pulled: 'Pulled' },
  },
];

export type ValueInput =
  | { type: 'range'; min: number; max: number; step: number }
  | { type: 'number'; step: number }
  | { type: 'checkbox' }
  | { type: 'text' };

export type IndicatorSample = {
  name: string;
  value: IndicatorValue;
  options?: JsonObject;
};

export type IndicatorFixture = {
  id: string;
  widget: string;
  title: string;
  label: string;
  options: JsonObject;
  initial: IndicatorValue;
  input: ValueInput;
  samples: readonly IndicatorSample[];
};

const lamps = ['amber', 'red', 'green', 'blue', 'white'] as const;

const lampSamples: IndicatorSample[] = lamps.flatMap((lamp) => [
  { name: `${lamp}, lit`, value: true, options: { lamp } },
  { name: `${lamp}, dark`, value: false, options: { lamp } },
]);

const stateLabels = { lit: 'ON', dark: 'OFF' };

export const indicatorFixtures: readonly IndicatorFixture[] = [
  {
    id: 'gauge-airspeed',
    widget: 'round-gauge',
    title: 'Round gauge with arcs',
    label: 'Airspeed',
    options: {
      min: 0,
      max: 160,
      units: 'kt',
      ticks: [0, 40, 80, 120, 160],
      arcs: [
        { from: 40, to: 85, colour: 'white' },
        { from: 50, to: 130, colour: 'green' },
        { from: 130, to: 150, colour: 'yellow' },
        { from: 150, to: 160, colour: 'red' },
      ],
    },
    initial: 80,
    input: { type: 'range', min: 0, max: 160, step: 1 },
    samples: [
      { name: 'minimum', value: 0 },
      { name: 'white arc', value: 60 },
      { name: 'green arc', value: 100 },
      { name: 'yellow arc', value: 140 },
      { name: 'red arc', value: 155 },
      { name: 'maximum', value: 160 },
    ],
  },
  {
    id: 'gauge-long-label',
    widget: 'round-gauge',
    title: 'Round gauge with a long label',
    label: 'Engine oil temperature',
    options: {
      min: 0,
      max: 250,
      units: 'degF',
      ticks: 5,
      arcs: [
        { from: 100, to: 220, colour: 'green' },
        { from: 220, to: 250, colour: 'red' },
      ],
    },
    initial: 160,
    input: { type: 'range', min: 0, max: 250, step: 1 },
    samples: [
      { name: 'cold', value: 40 },
      { name: 'normal', value: 160 },
      { name: 'hot', value: 240 },
    ],
  },
  {
    id: 'gauge-plain',
    widget: 'round-gauge',
    title: 'Round gauge with default options',
    label: 'Plain',
    options: {},
    initial: 50,
    input: { type: 'range', min: 0, max: 100, step: 1 },
    samples: [
      { name: 'minimum', value: 0 },
      { name: 'middle', value: 50 },
      { name: 'maximum', value: 100 },
    ],
  },
  {
    id: 'gauge-invalid',
    widget: 'round-gauge',
    title: 'Round gauge with invalid options',
    label: 'Broken gauge',
    options: { min: 10, max: 0 },
    initial: 5,
    input: { type: 'range', min: 0, max: 10, step: 1 },
    samples: [{ name: 'placeholder', value: 5 }],
  },
  {
    id: 'annunciator-lamps',
    widget: 'annunciator',
    title: 'Annunciator in every lamp colour',
    label: 'Caution',
    options: { lamp: 'amber' },
    initial: true,
    input: { type: 'checkbox' },
    samples: lampSamples,
  },
  {
    id: 'annunciator-state-labels',
    widget: 'annunciator',
    title: 'Annunciator with state labels',
    label: 'Pitot heat',
    options: { lamp: 'green', stateLabels },
    initial: false,
    input: { type: 'checkbox' },
    samples: [
      { name: 'lit', value: true },
      { name: 'dark', value: false },
    ],
  },
  {
    id: 'annunciator-long-label',
    widget: 'annunciator',
    title: 'Annunciator with a long label',
    label: 'Low fuel pressure',
    options: { lamp: 'red' },
    initial: true,
    input: { type: 'checkbox' },
    samples: [
      { name: 'lit', value: true },
      { name: 'dark', value: false },
    ],
  },
  {
    id: 'readout-number',
    widget: 'digital-readout',
    title: 'Digital readout of numbers',
    label: 'Airspeed',
    options: { units: 'kt', decimals: 0 },
    initial: 87,
    input: { type: 'number', step: 1 },
    samples: [
      { name: 'zero', value: 0 },
      { name: 'whole', value: 87 },
      { name: 'decimals', value: 87.46, options: { units: 'kt', decimals: 1 } },
      { name: 'negative', value: -450, options: { units: 'ft/min' } },
      { name: 'no units', value: 12, options: {} },
    ],
  },
  {
    id: 'readout-text',
    widget: 'digital-readout',
    title: 'Digital readout of text',
    label: 'Mode',
    options: {},
    initial: 'NAV',
    input: { type: 'text' },
    samples: [
      { name: 'short', value: 'NAV' },
      { name: 'long', value: 'GPS APPROACH ACTIVE' },
    ],
  },
];
