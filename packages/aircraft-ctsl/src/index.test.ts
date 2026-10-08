import { CONTRACT_VERSION, createSession, validateAircraft } from '@cpt/core';
import type { ControlDefinition } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import valveClosed from './assets/artwork/fuel-valve-closed.svg?raw';
import valveOpen from './assets/artwork/fuel-valve-open.svg?raw';
import viewCentre from './assets/view-centre.svg?raw';
import viewConsole from './assets/view-console.svg?raw';
import viewPanel from './assets/view-panel.svg?raw';
import { controlArtwork } from './artwork';
import { devices as installs } from './devices';
import { ctslAircraft } from './index';
import { chargeLampLit } from './indicators';
import { avionicsProcedures } from './procedures/avionics';
import { emergencyProcedures } from './procedures/emergency';
import { normalProcedures } from './procedures/normal';
import type { CtslState, CtslTrainerState } from './systems';
import { testDevices as devices } from './test-devices';
import { deviceSlots } from './views';

type Expected = {
  readonly kind: ControlDefinition['kind'];
  readonly positions: readonly string[];
  readonly initial: string;
  readonly view: string;
};

const breaker = (view: string, initial = 'in'): Expected => ({
  kind: 'breaker',
  positions: ['in', 'pulled'],
  initial,
  view,
});
const rocker = {
  kind: 'toggle',
  positions: ['off', 'on'],
  initial: 'off',
  view: 'centre',
} as const;
const offOn = { kind: 'lever', positions: ['off', 'on'], initial: 'off', view: 'console' } as const;

const expectedControls: Record<string, Expected> = {
  comBreaker: breaker('panel'),
  xpdrBreaker: breaker('panel'),
  gpsBreaker: breaker('panel'),
  positionBreaker: breaker('panel'),
  strobeBreaker: breaker('panel'),
  landingBreaker: breaker('panel'),
  intercomBreaker: breaker('panel'),
  outletBreaker: breaker('panel'),
  avionicsMaster: rocker,
  beacon: rocker,
  positionLights: rocker,
  intercom: rocker,
  cockpitLight: rocker,
  landingLight: rocker,
  elt: { kind: 'toggle', positions: ['armed', 'on'], initial: 'armed', view: 'centre' },
  flapBreaker: breaker('centre'),
  fuelValve: { kind: 'toggle', positions: ['open', 'closed'], initial: 'closed', view: 'centre' },
  flapSelector: {
    kind: 'rotary',
    positions: ['override-up', '-12', '0', '15', '30', '35', 'override-down'],
    initial: '0',
    view: 'centre',
  },
  ignition: {
    kind: 'rotary',
    positions: ['off', 'left', 'right', 'both', 'start'],
    initial: 'off',
    view: 'centre',
  },
  battery: breaker('centre', 'pulled'),
  generator: breaker('centre', 'pulled'),
  brake: offOn,
  throttle: {
    kind: 'lever',
    positions: ['idle', 'low', 'runup', 'cruise', 'full'],
    initial: 'idle',
    view: 'console',
  },
  choke: offOn,
  carbHeat: offOn,
  trim: {
    kind: 'lever',
    positions: ['nose-down', 'neutral', 'nose-up'],
    initial: 'neutral',
    view: 'console',
  },
  parkingBrakeValve: {
    kind: 'toggle',
    positions: ['open', 'closed'],
    initial: 'open',
    view: 'console',
  },
  rescueHandle: {
    kind: 'guarded',
    positions: ['stowed', 'pulled'],
    initial: 'stowed',
    view: 'console',
  },
};

const expectedIndicators: Record<string, { widget: string; view: string }> = {
  compass: { widget: 'artwork', view: 'panel' },
  airspeed: { widget: 'artwork', view: 'panel' },
  altimeter: { widget: 'artwork', view: 'panel' },
  verticalSpeed: { widget: 'artwork', view: 'panel' },
  tachometer: { widget: 'artwork', view: 'panel' },
  oilPressure: { widget: 'artwork', view: 'panel' },
  oilTemperature: { widget: 'artwork', view: 'panel' },
  cht: { widget: 'artwork', view: 'panel' },
  chargeLamp: { widget: 'artwork', view: 'panel' },
  flapReadout: { widget: 'digital-readout', view: 'centre' },
  eltLamp: { widget: 'annunciator', view: 'centre' },
};

const expectedPhases = {
  parking: { airspeedKt: 0, altitudeFt: 0, onGround: true },
  holding: { airspeedKt: 0, altitudeFt: 0, onGround: true },
  linedUp: { airspeedKt: 0, altitudeFt: 0, onGround: true },
  departure: { airspeedKt: 57, altitudeFt: 200, onGround: false },
  cruise: { airspeedKt: 108, altitudeFt: 2500, onGround: false },
  approach: { airspeedKt: 59, altitudeFt: 500, onGround: false },
  landing: { airspeedKt: 54, altitudeFt: 3, onGround: false },
  taxiIn: { airspeedKt: 0, altitudeFt: 0, onGround: true },
  parkingSecuring: { airspeedKt: 0, altitudeFt: 0, onGround: true },
};

const viewOfControl = (id: string) =>
  Object.entries(ctslAircraft.views).find(([, view]) => view.controls?.[id])?.[0];
const viewOfIndicator = (id: string) =>
  Object.entries(ctslAircraft.views).find(([, view]) => view.indicators?.[id])?.[0];
const entryState = (phase: string) => ctslAircraft.phases[phase]?.entry.state as CtslState;

describe('CTSL aircraft', () => {
  it('targets the current contract', () => {
    expect(ctslAircraft.contractVersion).toBe(CONTRACT_VERSION);
  });

  it('passes the validator', () => {
    expect(validateAircraft(ctslAircraft, { devices })).toEqual([]);
  });

  it('arranges every view in the cockpit', () => {
    expect(Object.keys(ctslAircraft.cockpit?.views ?? {}).sort()).toEqual(
      Object.keys(ctslAircraft.views).sort(),
    );
  });

  it('calls the panel representative in both languages', () => {
    expect(ctslAircraft.id).toBe('ctsl');
    expect(ctslAircraft.name).toEqual({
      de: 'CT Supralight (repräsentatives Panel)',
      en: 'CT Supralight (representative panel)',
    });
    expect(ctslAircraft.handbookRevision).toEqual({
      de: 'Flight Design CT Supralight Flug- und Wartungshandbuch AE04300003, Revision 01 (14. Jan. 2010)',
      en: 'Flight Design CT Supralight flight and maintenance manual AE04300003, revision 01 (14 Jan 2010)',
    });
  });

  it('declares exactly the controls of the analog panel', () => {
    expect(Object.keys(ctslAircraft.controls).sort()).toEqual(Object.keys(expectedControls).sort());
  });

  it.each(Object.entries(expectedControls))(
    'declares %s with its kind, positions, initial position and view',
    (id, expected) => {
      const control = ctslAircraft.controls[id];
      expect(control?.kind).toBe(expected.kind);
      expect(control?.positions).toEqual(expected.positions);
      expect(control?.initial).toBe(expected.initial);
      expect(viewOfControl(id)).toBe(expected.view);
    },
  );

  it('springs the ignition key back from START to BOTH', () => {
    const ignition = ctslAircraft.controls.ignition;
    expect(ignition?.kind === 'rotary' && ignition.springBack).toEqual({ start: 'both' });
    expect(ignition?.appearance).toHaveProperty('artwork');
  });

  it('guards the rescue handle with the safety pin', () => {
    const handle = ctslAircraft.controls.rescueHandle;
    expect(handle?.kind === 'guarded' && handle.guard.name).toEqual({
      de: 'Sicherungsstift',
      en: 'Safety pin',
    });
  });

  it('marks carb heat as provisional', () => {
    expect(ctslAircraft.controls.carbHeat?.description.en).toMatch(/provisional/i);
    expect(ctslAircraft.controls.carbHeat?.description.de).toMatch(/vorläufig/i);
  });

  it('declares exactly the indicators of the analog panel', () => {
    expect(Object.keys(ctslAircraft.indicators).sort()).toEqual(
      Object.keys(expectedIndicators).sort(),
    );
  });

  it.each(Object.entries(expectedIndicators))(
    'declares indicator %s with its widget and view',
    (id, expected) => {
      const appearance = ctslAircraft.indicators[id]?.appearance;
      expect(appearance && ('widget' in appearance ? appearance.widget : 'artwork')).toBe(
        expected.widget,
      );
      expect(viewOfIndicator(id)).toBe(expected.view);
    },
  );

  it('has the three views of the panel inventory', () => {
    expect(Object.keys(ctslAircraft.views)).toEqual(['panel', 'centre', 'console']);
  });

  it.each(Object.entries(deviceSlots))(
    'reserves the %s slot inside the panel view',
    (_id, slot) => {
      const size = ctslAircraft.views.panel?.size;
      if (!size) throw new Error('the panel view declares no size');
      const { x, y, w, h } = slot.rect;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(size.width);
      expect(y + h).toBeLessThanOrEqual(size.height);
    },
  );

  it('installs every device in the panel view', () => {
    const views = Object.values(ctslAircraft.devices ?? {}).map(({ view }) => view);
    expect(views).toEqual(['panel', 'panel', 'panel']);
  });

  it('arranges its three views and a dock, with the panel floor at 950', () => {
    expect(Object.keys(ctslAircraft.cockpit?.views ?? {})).toEqual(['panel', 'centre', 'console']);
    expect(ctslAircraft.cockpit?.dock).toBeDefined();
    expect(ctslAircraft.cockpit?.views.panel?.minWidth).toBeGreaterThanOrEqual(950);
  });

  describe('cockpit arrangement (intake §3)', () => {
    const cockpit = ctslAircraft.cockpit;
    const panelSize = ctslAircraft.views.panel?.size;
    const { panel, centre, console: consoleCell } = cockpit?.views ?? {};
    const dock = cockpit?.dock;
    if (!panelSize || !panel || !centre || !consoleCell || !dock) {
      throw new Error('the CTSL declares no panel size or misses a cockpit cell');
    }
    const right = ({ rect }: { rect: { x: number; w: number } }) => rect.x + rect.w;
    const bottom = ({ rect }: { rect: { y: number; h: number } }) => rect.y + rect.h;
    const middle = ({ rect }: { rect: { x: number; w: number } }) => rect.x + rect.w / 2;

    // The two upper fields are the full-height rects of the panel artwork.
    const fields = [
      ...viewPanel.matchAll(/<rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)" height="([\d.]+)"/g),
    ]
      .map(([, x, w, h]) => ({ x: Number(x), w: Number(w), h: Number(h) }))
      .filter(({ w, h }) => h >= 0.95 * panelSize.height && w < panelSize.width)
      .filter((field, index, all) => all.findIndex(({ x }) => x === field.x) === index)
      .sort((a, b) => a.x - b.x);
    const [upperLeft, upperRight] = fields;
    if (fields.length !== 2 || !upperLeft || !upperRight) {
      throw new Error(`expected two upper fields in the panel art, found ${fields.length}`);
    }
    const panelFit = Math.min(panel.rect.w, (panel.rect.h * panelSize.width) / panelSize.height);
    const inCockpit = (artX: number) =>
      panel.rect.x + (panel.rect.w - panelFit) / 2 + (artX * panelFit) / panelSize.width;
    const junction = inCockpit((upperLeft.x + upperLeft.w + upperRight.x) / 2);

    it('hangs the centre field below the panel, under the junction of the two upper fields', () => {
      expect(centre.rect.y).toBeGreaterThanOrEqual(bottom(panel));
      expect(middle(centre)).toBeGreaterThan(panel.rect.x + panel.rect.w / 3);
      expect(middle(centre)).toBeLessThan(panel.rect.x + (2 * panel.rect.w) / 3);
      expect(Math.abs(middle(centre) - junction)).toBeLessThanOrEqual(2);
    });

    it('puts the console beside the centre field, toward the right seat', () => {
      expect(consoleCell.rect.y).toBeGreaterThanOrEqual(bottom(panel));
      expect(consoleCell.rect.x).toBeGreaterThanOrEqual(right(centre));
      expect(consoleCell.rect.y).toBeLessThan(bottom(centre));
    });

    it('keeps the dock below the panel, clear of the centre column', () => {
      expect(dock.rect.y).toBeGreaterThanOrEqual(bottom(panel));
      expect(right(dock)).toBeLessThanOrEqual(centre.rect.x);
    });

    it('reaches under the radio and transponder slots with the dock', () => {
      const { com } = deviceSlots;
      const [slotLeft, slotRight] = [inCockpit(com.rect.x), inCockpit(com.rect.x + com.rect.w)];
      const overlap = Math.min(right(dock), slotRight) - Math.max(dock.rect.x, slotLeft);
      expect(overlap).toBeGreaterThanOrEqual((slotRight - slotLeft) / 3);
    });
  });

  describe('centre field (intake §3.3)', () => {
    // The web app's --size-target token; the centre cell renders at least its floor wide.
    const TOUCH_TARGET_PX = 44;
    const view = ctslAircraft.views.centre;
    const floor = ctslAircraft.cockpit?.views.centre?.minWidth;
    const size = view?.size;
    if (!view?.controls || !floor || !size) throw new Error('the CTSL has no centre field');
    const placed = view.controls;
    const rectOf = (id: keyof typeof placed) => {
      const rect = placed[id]?.rect;
      if (!rect) throw new Error(`the centre field does not place ${id}`);
      return rect;
    };
    const middle = (id: keyof typeof placed) => rectOf(id).x + rectOf(id).w / 2;

    it.each(Object.keys(placed))('draws %s at least the touch target at the floor', (id) => {
      const { w, h } = rectOf(id as keyof typeof placed);
      expect(Math.min(w, h) * (floor / size.width)).toBeGreaterThanOrEqual(TOUCH_TARGET_PX);
    });

    it('draws the Avionics Master larger than the other rockers', () => {
      const master = rectOf('avionicsMaster');
      for (const id of ['beacon', 'positionLights', 'intercom', 'cockpitLight', 'landingLight']) {
        const rocker = rectOf(id as keyof typeof placed);
        expect(master.w, id).toBeGreaterThan(rocker.w);
        expect(master.h, id).toBeGreaterThan(rocker.h);
      }
    });

    it('puts the ELT left of centre, clear of the left edge, and the flap selector right of it', () => {
      expect(middle('elt')).toBeLessThan(size.width / 2);
      expect(middle('elt')).toBeGreaterThan(size.width / 4);
      expect(middle('flapSelector')).toBeGreaterThan(size.width / 2);
      expect(rectOf('battery').x).toBeGreaterThanOrEqual(
        rectOf('flapSelector').x + rectOf('flapSelector').w,
      );
    });

    it('lays the closed valve handle over the key slot, and the open one clear of the key', () => {
      const valve = rectOf('fuelValve');
      const ignition = rectOf('ignition');
      const slot = { x: ignition.x + ignition.w / 2, y: ignition.y + ignition.h / 2 };
      const handle = (svg: string) => {
        const [, x, y, w, h] =
          /<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"[^>]*fill="url\(#a\)"/.exec(
            svg,
          ) ?? [];
        return { x: valve.x + Number(x), y: valve.y + Number(y), w: Number(w), h: Number(h) };
      };
      const covers = (part: ReturnType<typeof handle>) =>
        slot.x > part.x && slot.x < part.x + part.w && slot.y > part.y && slot.y < part.y + part.h;
      expect(covers(handle(valveClosed))).toBe(true);
      expect(handle(valveOpen).y + handle(valveOpen).h).toBeLessThan(ignition.y);
      const { options } = controlArtwork.fuelValve;
      expect(options.hitArea).not.toHaveProperty('closed');
      const hitBottom =
        valve.y + (options.hitArea.open.top + options.hitArea.open.height) * valve.h;
      expect(hitBottom).toBeLessThan(ignition.y);
      expect(hitBottom).toBeGreaterThan(handle(valveOpen).y + handle(valveOpen).h);
      const order = Object.keys(placed);
      expect(order.indexOf('fuelValve')).toBeGreaterThan(order.indexOf('ignition'));
    });
  });

  it('stacks the radio above the transponder', () => {
    const { com, xpdr } = deviceSlots;
    expect(com.rect.y + com.rect.h).toBeLessThanOrEqual(xpdr.rect.y);
  });

  it('lists the phases of a whole flight in flight order', () => {
    expect(Object.keys(ctslAircraft.phases)).toEqual(Object.keys(expectedPhases));
  });

  it.each(Object.entries(expectedPhases))(
    'sets the %s environment from the intake presets',
    (id, environment) => {
      expect(ctslAircraft.phases[id]?.environment).toEqual(environment);
    },
  );

  it('enters parking cold, with the fuel valve closed and the parking brake set', () => {
    const parking = ctslAircraft.phases.parking;
    expect(parking?.entry.controls).toMatchObject({
      ignition: 'off',
      fuelValve: 'closed',
      battery: 'pulled',
      generator: 'pulled',
      avionicsMaster: 'off',
      parkingBrakeValve: 'closed',
      rescueHandle: 'stowed',
    });
    expect(entryState('parking').engine.running).toBe(false);
    expect(entryState('parking').parkingBrakeSet).toBe(true);
  });

  it('enters parking cold and dark: every rocker off, nothing powered or lit', () => {
    const entry = ctslAircraft.phases.parking?.entry.controls as Record<string, string>;
    const rockers = Object.entries(ctslAircraft.controls).filter(
      ([, { kind, positions }]) => kind === 'toggle' && positions.join() === 'off,on',
    );
    expect(rockers.map(([id]) => id).sort()).toEqual(
      [
        'avionicsMaster',
        'beacon',
        'cockpitLight',
        'intercom',
        'landingLight',
        'positionLights',
      ].sort(),
    );
    for (const [id] of rockers) expect(entry[id], id).toBe('off');
    expect(entry).toMatchObject({ ignition: 'off', fuelValve: 'closed', brake: 'off' });
    const state = entryState('parking');
    expect(state.bus).toEqual({ mainPowered: false, avionicsPowered: false, charging: false });
    expect(Object.values(state.consumers).filter(Boolean)).toEqual([]);
  });

  it.each(Object.keys(expectedPhases).filter((id) => id !== 'parking'))(
    'enters %s with the engine running',
    (id) => {
      expect(entryState(id).engine.running).toBe(true);
      expect(ctslAircraft.phases[id]?.entry.controls).toMatchObject({
        ignition: 'both',
        fuelValve: 'open',
        battery: 'in',
        generator: 'in',
        avionicsMaster: 'on',
        choke: 'off',
      });
      expect(entryState(id).bus).toEqual({
        mainPowered: true,
        avionicsPowered: true,
        charging: true,
      });
    },
  );

  it('enters parking with a dead bus', () => {
    expect(entryState('parking').bus).toEqual({
      mainPowered: false,
      avionicsPowered: false,
      charging: false,
    });
  });

  it.each([
    ['parking', 'idle'],
    ['holding', 'idle'],
    ['departure', 'full'],
    ['cruise', 'cruise'],
    ['approach', 'low'],
    ['landing', 'idle'],
    ['taxiIn', 'low'],
    ['parkingSecuring', 'idle'],
  ])('enters %s with the throttle at %s', (id, throttle) => {
    expect(ctslAircraft.phases[id]?.entry.controls.throttle).toBe(throttle);
  });

  it.each([
    ['parking', true],
    ['holding', true],
    ['departure', false],
    ['cruise', false],
    ['approach', false],
    ['landing', false],
    ['taxiIn', false],
    ['parkingSecuring', false],
  ])('enters %s with the parking brake set: %s', (id, set) => {
    expect(ctslAircraft.phases[id]?.entry.controls).toMatchObject({
      parkingBrakeValve: set ? 'closed' : 'open',
      brake: 'off',
    });
    expect(entryState(id).parkingBrakeSet).toBe(set);
  });

  it.each(Object.keys(expectedPhases))('enters %s with the charge lamp out', (id) => {
    const state: CtslTrainerState = {
      controls: ctslAircraft.phases[id]?.entry.controls ?? {},
      systems: entryState(id),
      devices: {},
    };
    expect(chargeLampLit(state)).toBe(false);
  });

  it.each([
    [{ mainPowered: true, avionicsPowered: false, charging: false }, true],
    [{ mainPowered: true, avionicsPowered: false, charging: true }, false],
    [{ mainPowered: false, avionicsPowered: false, charging: false }, false],
  ])('lights the charge lamp only on a powered bus that is not charging: %o', (bus, lit) => {
    const systems = { ...entryState('parking'), bus };
    expect(chargeLampLit({ controls: {}, systems, devices: {} })).toBe(lit);
  });

  it.each([
    ['holding', '0'],
    ['departure', '0'],
    ['cruise', '-12'],
    ['approach', '15'],
    ['landing', '30'],
    ['taxiIn', '30'],
    ['parkingSecuring', '0'],
  ])('enters %s with the flaps at %s°', (id, flaps) => {
    expect(ctslAircraft.phases[id]?.entry.controls.flapSelector).toBe(flaps);
    expect(entryState(id).flaps).toEqual({ angle: Number(flaps), moving: false });
  });

  it.each(
    Object.entries(expectedPhases)
      .filter(([, environment]) => !environment.onGround)
      .map(([id]) => id),
  )('carries the altitude and airspeed of the %s environment in its entry state', (id) => {
    const phase = ctslAircraft.phases[id];
    expect(entryState(id).altitudeFt).toBe(phase?.environment.altitudeFt);
    expect(entryState(id).onGround).toBe(false);
    expect(entryState(id).airspeedKmh).toBeCloseTo((phase?.environment.airspeedKt ?? 0) * 1.852);
  });

  it.each(
    Object.entries(expectedPhases)
      .filter(([, environment]) => environment.onGround)
      .map(([id]) => id),
  )('enters %s on the ground at rest', (id) => {
    expect(entryState(id).onGround).toBe(true);
    expect(entryState(id).airspeedKmh).toBe(0);
    expect(entryState(id).altitudeFt).toBe(0);
  });

  it('declares every failure of the plan, none tripping a breaker', () => {
    expect(Object.keys(ctslAircraft.failures)).toEqual([
      'generatorFailure',
      'engineStoppage',
      'engineFire',
      'coolantLoss',
      'oilLoss',
      'flapControlFailure',
    ]);
    for (const failure of Object.values(ctslAircraft.failures))
      expect(failure.trips).toBeUndefined();
  });

  it('assembles the procedures of its three modules and the installs of its devices module', () => {
    expect(ctslAircraft.procedures).toEqual({
      ...normalProcedures,
      ...emergencyProcedures,
      ...avionicsProcedures,
    });
    expect(ctslAircraft.devices).toEqual(installs);
  });

  it.each([
    ['parking', 'in', 'closed'],
    ['holding', 'in', 'closed'],
    ['departure', 'out', 'open'],
    ['cruise', 'out', 'open'],
    ['approach', 'out', 'open'],
    ['landing', 'out', 'open'],
    ['taxiIn', 'out', 'open'],
    ['parkingSecuring', 'out', 'open'],
  ])('enters %s with the rescue safety pin %s', (phase, _pin, guard) => {
    const session = createSession(ctslAircraft, { devices, phase });
    expect(session.guards().rescueHandle).toBe(guard);
  });

  it('starts a session at every phase', () => {
    for (const phase of Object.keys(expectedPhases)) {
      const session = createSession(ctslAircraft, { devices, phase });
      expect(session.state().controls).toMatchObject(
        ctslAircraft.phases[phase]?.entry.controls ?? {},
      );
    }
  });
});

describe('declared view sizes', () => {
  const sources: Record<string, string> = {
    panel: viewPanel,
    centre: viewCentre,
    console: viewConsole,
  };

  it.each(Object.keys(sources))('view %s matches the viewBox of its image', (id) => {
    const match = /viewBox="([^"]+)"/.exec(sources[id] ?? '');
    const [x, y, width, height] = (match?.[1] ?? '').split(/[\s,]+/).map(Number);
    expect([x, y]).toEqual([0, 0]);
    expect(ctslAircraft.views[id]?.size).toEqual({ width, height });
  });
});
