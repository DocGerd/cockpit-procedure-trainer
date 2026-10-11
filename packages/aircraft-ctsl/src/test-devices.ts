import { defineDevice } from '@cpt/core';
import type { Device, Positions, Text } from '@cpt/core';

const text = (de: string, en: string): Text => ({ de, en });

const momentary = (name: Text) =>
  ({
    kind: 'momentary',
    positions: ['released', 'pressed'],
    initial: 'released',
    name,
    description: name,
  }) as const;

const knob = (name: Text) =>
  ({
    kind: 'rotary',
    positions: ['rest', 'down', 'up'],
    initial: 'rest',
    springBack: { down: 'rest', up: 'rest' },
    name,
    description: name,
  }) as const;

type Held = Readonly<Record<string, string>>;

const heldOf = (controls: Positions): Held =>
  Object.fromEntries(Object.entries(controls).map(([id, position]) => [id, String(position)]));

/** A key or detent that moved to `position` since the last step. */
const reached = (held: Held, previous: Held, id: string, position = 'pressed') =>
  held[id] === position && previous[id] !== position;

const atr833StandIn = defineDevice({
  id: 'atr833',
  manual: text('Platzhalter für Tests', 'Test stand-in'),
  notModelled: [text('alles', 'everything')],
  controls: {
    power: momentary(text('Ein/Aus', 'On/off')),
    set: momentary(text('SET', 'SET')),
    mem: momentary(text('Speicher', 'Memory')),
    dw: momentary(text('Zweikanalhören', 'Dual watch')),
    swap: momentary(text('Tausch', 'Swap')),
    cursor: momentary(text('Cursor', 'Cursor')),
    volSel: knob(text('VOL/SEL', 'VOL/SEL')),
    freq: knob(text('Frequenz', 'Frequency')),
  },
  initial: { on: false, powered: false, active: 118_000, standby: 119_000, held: {} as Held },
  // Switches on with the bus (AUTO ON) and steps the standby frequency in whole MHz.
  step: (state, { controls, powered }) => {
    const held = heldOf(controls);
    if (!powered) return { ...state, on: false, powered: false, held };
    let { active, standby } = state;
    if (reached(held, state.held, 'freq', 'up')) standby += 1000;
    if (reached(held, state.held, 'freq', 'down')) standby -= 1000;
    if (reached(held, state.held, 'swap')) [active, standby] = [standby, active];
    return { on: true, powered: true, active, standby, held };
  },
});

const trt800hStandIn = defineDevice({
  id: 'trt800h',
  manual: text('Platzhalter für Tests', 'Test stand-in'),
  notModelled: [text('alles', 'everything')],
  controls: {
    power: momentary(text('Ein/Aus', 'On/off')),
    vfr: momentary(text('VFR', 'VFR')),
    ident: momentary(text('Ident', 'Ident')),
    mode: momentary(text('Betriebsart', 'Mode')),
    swap: momentary(text('Wechsel', 'Change')),
    cursor: momentary(text('Cursor', 'Cursor')),
    knob: knob(text('Drehknopf', 'Knob')),
  },
  initial: { on: false, mode: 'stby', squawk: '2000', reporting: false, held: {} as Held },
  // A tap switches it on in standby; switching off needs a hold, which no procedure uses.
  step: (state, { controls, powered }) => {
    const held = heldOf(controls);
    if (!powered) return { ...state, on: false, mode: 'stby', reporting: false, held };
    const on = state.on || reached(held, state.held, 'power');
    if (!on) return { ...state, held };
    const modes = ['stby', 'acs', 'as'];
    const mode = reached(held, state.held, 'mode')
      ? (modes[(modes.indexOf(state.mode) + 1) % modes.length] ?? 'stby')
      : state.mode;
    const squawk = reached(held, state.held, 'vfr') ? '7000' : state.squawk;
    return { on, mode, squawk, reporting: mode === 'acs', held };
  },
});

const touchIcons = [
  'accept',
  'home',
  'back',
  'map',
  'nearest',
  'activeFpl',
  'directTo',
  'position',
  'tools',
  'gpsStatus',
  'zoomOut',
  'zoomIn',
  'dimmer',
  'brighter',
] as const;

const aera500StandIn = defineDevice({
  id: 'aera500',
  manual: text('Platzhalter für Tests', 'Test stand-in'),
  notModelled: [text('alles', 'everything')],
  controls: {
    power: momentary(text('Ein/Aus', 'Power')),
    touch: {
      kind: 'rotary',
      positions: ['rest', ...touchIcons],
      initial: 'rest',
      springBack: Object.fromEntries(touchIcons.map((icon) => [icon, 'rest'])),
      name: text('Touchscreen', 'Touchscreen'),
      description: text('Touchscreen', 'Touchscreen'),
    },
  },
  initial: { on: false, powered: false, page: 'startup', fix: false, held: {} as Held },
  // Starts with cradle power and finds its fix at once: the search is the device's own concern.
  step: (state, { controls, powered }) => {
    const held = heldOf(controls);
    if (!powered) return { ...state, on: false, powered: false, page: 'startup', fix: false, held };
    let page = state.powered ? state.page : 'startup';
    if (page === 'startup' && reached(held, state.held, 'touch', 'accept')) page = 'home';
    else if (page === 'home' && reached(held, state.held, 'touch', 'map')) page = 'map';
    return { on: true, powered: true, page, fix: true, held };
  },
});

const flarmStandIn = defineDevice({
  id: 'flarm',
  manual: text('Platzhalter für Tests', 'Test stand-in'),
  notModelled: [text('alles', 'everything')],
  controls: { mode: momentary(text('Mode-Taste', 'Mode key')) },
  initial: { powered: false, stage: 'selfTest', fix: false, operational: false },
  // Ready with a fix as soon as power arrives: the self-test and search are the device's concern.
  step: (state, { powered }) => ({
    ...state,
    powered,
    stage: powered ? 'ready' : 'selfTest',
    fix: powered,
    operational: powered,
  }),
});

// An aircraft depends on core only, so its tests install stand-ins that share the control ids of
// the real devices and the state fields its procedures and phase seeds read.
export const testDevices: readonly Device[] = [
  atr833StandIn as Device,
  trt800hStandIn as Device,
  aera500StandIn as Device,
  flarmStandIn as Device,
];
