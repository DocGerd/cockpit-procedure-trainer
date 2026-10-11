import { CONTRACT_VERSION, createSession, phaseOrder, STEP_MS, validateAircraft } from '@cpt/core';
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
import { deviceSlots, views } from './views';

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
    positions: ['out', 'off', 'left', 'right', 'both', 'start'],
    initial: 'out',
    view: 'centre',
  },
  battery: breaker('centre', 'pulled'),
  generator: breaker('centre', 'pulled'),
  brake: { ...offOn, kind: 'momentary' },
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
    positions: ['nose-down', 'half-down', 'neutral', 'half-up', 'nose-up'],
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
  airspeed: { widget: 'artwork', view: 'panel' },
  altimeter: { widget: 'artwork', view: 'panel' },
  verticalSpeed: { widget: 'artwork', view: 'panel' },
  tachometer: { widget: 'artwork', view: 'panel' },
  oilPressure: { widget: 'artwork', view: 'panel' },
  oilTemperature: { widget: 'artwork', view: 'panel' },
  cht: { widget: 'artwork', view: 'panel' },
  voltmeter: { widget: 'artwork', view: 'panel' },
  chargeLamp: { widget: 'artwork', view: 'panel' },
  flapReadout: { widget: 'digital-readout', view: 'centre' },
  eltLamp: { widget: 'annunciator', view: 'centre' },
};

const expectedPhases = {
  parking: { airspeedKt: 0, altitudeFt: 0, onGround: true },
  taxiOut: { airspeedKt: 0, altitudeFt: 0, onGround: true },
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

/** The three upper plates of the panel art, left to right, as the boxes their outlines span. */
const upperPlates = [...viewPanel.matchAll(/<(rect|path) data-plate="(\w+)"([^>]*)>/g)]
  .map(([, tag, , attributes = '']) => {
    const number = (name: string) =>
      Number(new RegExp(`\\b${name}="([\\d.]+)"`).exec(attributes)?.[1]);
    if (tag === 'rect') {
      return { x: number('x'), y: number('y'), w: number('width'), h: number('height') };
    }
    const values = [...(/\bd="([^"]+)"/.exec(attributes)?.[1] ?? '').matchAll(/-?[\d.]+/g)].map(
      Number,
    );
    const xs = values.filter((_, index) => index % 2 === 0);
    const ys = values.filter((_, index) => index % 2 === 1);
    const [x, y] = [Math.min(...xs), Math.min(...ys)];
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  })
  .sort((a, b) => a.x - b.x);

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

  it('names the aircraft by its type in both languages, drawn from D-MPGO', () => {
    expect(ctslAircraft.id).toBe('ctsl');
    expect(ctslAircraft.name).toEqual({ de: 'CT Supralight', en: 'CT Supralight' });
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

  it('springs the ignition key back from START to 1+2', () => {
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

  it('describes the rescue pull forward, hard, to the stop, the pin through the release lever', () => {
    const description = ctslAircraft.controls.rescueHandle?.description;
    expect(description?.en).toMatch(/forward, hard, to the stop/);
    expect(description?.en).toMatch(/release lever/);
    expect(description?.de).toMatch(/nach vorn, kräftig, bis zum Anschlag/);
    expect(description?.de).toMatch(/Auslösehebel/);
  });

  it('marks carb heat as provisional', () => {
    expect(ctslAircraft.controls.carbHeat?.description.en).toMatch(/provisional/i);
    expect(ctslAircraft.controls.carbHeat?.description.de).toMatch(/vorläufig/i);
  });

  it('trims in steps, neutral in the middle and each end reachable', () => {
    const { positions, initial } = ctslAircraft.controls.trim ?? { positions: [], initial: '' };
    expect(positions.length).toBeGreaterThan(3);
    expect(positions[0]).toBe('nose-down');
    expect(positions[positions.length - 1]).toBe('nose-up');
    expect(positions[(positions.length - 1) / 2]).toBe('neutral');
    expect(initial).toBe('neutral');
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

  it('has the views of the panel inventory', () => {
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
    expect(views).toEqual(['panel', 'panel', 'panel', 'panel']);
  });

  it.each([
    ['flarm', 314, 157],
    ['gps', 392, 245],
    ['com', 267, 267],
    ['xpdr', 267, 267],
  ] as const)('sizes the %s slot at its mirror aspect, %i by %i', (id, w, h) => {
    expect(deviceSlots[id].rect).toMatchObject({ w, h });
    expect(installs[id].placement).toBe(deviceSlots[id]);
  });

  it('arranges its views and a dock, with the panel floor at 1110', () => {
    expect(Object.keys(ctslAircraft.cockpit?.views ?? {})).toEqual(['panel', 'centre', 'console']);
    expect(ctslAircraft.cockpit?.dock).toBeDefined();
    expect(ctslAircraft.cockpit?.views.panel?.minWidth).toBe(1110);
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

    const [upperLeft, upperCentre, upperRight] = upperPlates;
    if (upperPlates.length !== 3 || !upperLeft || !upperCentre || !upperRight) {
      throw new Error(`expected three upper plates in the panel art, found ${upperPlates.length}`);
    }
    const panelFit = Math.min(panel.rect.w, (panel.rect.h * panelSize.width) / panelSize.height);
    const inCockpit = (artX: number) =>
      panel.rect.x + (panel.rect.w - panelFit) / 2 + (artX * panelFit) / panelSize.width;
    const fieldLeft = inCockpit(upperCentre.x);
    const fieldWidth = (upperCentre.w * panelFit) / panelSize.width;

    // On D-MPGO the lower column hangs left of the centre plate's middle, toward the pilot; intake
    // §3.9.6 gives the measured offset.
    it('hangs the centre field below the upper-centre plate, offset from its middle toward the pilot', () => {
      const airspeed = ctslAircraft.views.panel?.indicators?.['airspeed']?.rect.w ?? 0;
      const unitA = (airspeed * panelFit) / panelSize.width;
      const offset = fieldLeft + fieldWidth / 2 - middle(centre);
      expect(centre.rect.y).toBeGreaterThanOrEqual(bottom(panel));
      expect(middle(centre)).toBeGreaterThan(fieldLeft);
      expect(offset / unitA).toBeGreaterThanOrEqual(0.25);
      expect(offset / unitA).toBeLessThanOrEqual(0.5);
    });

    it('puts the console beside the centre field, toward the right seat', () => {
      expect(consoleCell.rect.y).toBeGreaterThanOrEqual(bottom(panel));
      expect(consoleCell.rect.x).toBeGreaterThanOrEqual(right(centre));
      expect(consoleCell.rect.y).toBeLessThan(bottom(centre));
    });

    it('runs the console down to the bulkhead at the bottom of the cockpit', () => {
      expect(bottom(consoleCell)).toBe(cockpit?.size.height);
    });

    it('keeps the dock below the panel, clear of the centre column', () => {
      expect(dock.rect.y).toBeGreaterThanOrEqual(bottom(panel));
      expect(right(dock)).toBeLessThanOrEqual(centre.rect.x);
    });

    // The radios sit where D-MPGO has them, at the bottom of the centre plate (intake §3.9.7), so
    // they no longer reach over the dock.
    it('sets the radios over the centre column, right of the dock', () => {
      const { com, xpdr } = deviceSlots;
      expect(inCockpit(com.rect.x)).toBeGreaterThanOrEqual(right(dock));
      expect(inCockpit(com.rect.x)).toBeLessThan(middle(centre));
      expect(inCockpit(xpdr.rect.x + xpdr.rect.w)).toBeGreaterThan(middle(centre));
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
          /<rect data-grip="" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/.exec(
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

  describe('centre console (intake §3.4)', () => {
    // The web app's --size-target token; each cell renders at least its floor wide.
    const TOUCH_TARGET_PX = 44;
    // The guard's share of an open guarded placement, the handle taking the rest (panel-kit artwork.css).
    const OPEN_GUARD_SHARE = 0.4;
    const view = ctslAircraft.views.console;
    const floor = ctslAircraft.cockpit?.views.console?.minWidth;
    if (!view?.controls || !view.size || !floor) throw new Error('the CTSL has no console');
    const consoleView = {
      rects: Object.fromEntries(
        Object.entries(view.controls).flatMap(([id, placement]) =>
          placement ? [[id, placement.rect] as const] : [],
        ),
      ),
      scale: floor / view.size.width,
    };
    const rectOf = (id: string) => {
      const rect = consoleView.rects[id];
      if (!rect) throw new Error(`the console does not place ${id}`);
      return rect;
    };
    const right = (id: string) => rectOf(id).x + rectOf(id).w;
    const bottom = (id: string) => rectOf(id).y + rectOf(id).h;

    const targets = Object.entries(consoleView.rects).map(
      ([id, rect]) => [id, Math.min(rect.w, rect.h) * consoleView.scale] as const,
    );

    it.each(targets)('draws %s at least the touch target at the floor', (_id, size) => {
      expect(size).toBeGreaterThanOrEqual(TOUCH_TARGET_PX);
    });

    it('opens the safety pin and the rescue handle each at least the touch target at the floor', () => {
      const height = rectOf('rescueHandle').h * consoleView.scale;
      expect(height * OPEN_GUARD_SHARE, 'safety pin').toBeGreaterThanOrEqual(TOUCH_TARGET_PX);
      expect(height * (1 - OPEN_GUARD_SHARE), 'handle').toBeGreaterThanOrEqual(TOUCH_TARGET_PX);
    });

    // §3.9 gives no measured place for the parachute placard; §3.7.1 lists it just forward of the
    // handle, between the trim wheels, and the handle is centred, so the placard is too (#729).
    it('centres the parachute placard over the rescue handle', () => {
      const card =
        /<g transform="translate\(([\d.]+) 0\)">(?:(?!<\/g>)[\s\S])*?<rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)" height="[\d.]+" rx="6" fill="url\(#pc\)"\/>(?:(?!<\/g>)[\s\S])*?<\/g><text x="[\d.]+" y="[\d.]+"[^>]*>Ballistic</.exec(
          viewConsole,
        );
      expect(card).not.toBeNull();
      const [, shift = 0, x = 0, w = 0] = (card ?? []).map(Number);
      const handle = rectOf('rescueHandle');
      expect(Math.abs(shift + x + w / 2 - (handle.x + handle.w / 2))).toBeLessThan(2);
      expect(rectOf('parkingBrakeValve').x).toBeGreaterThanOrEqual(handle.x + handle.w);
    });

    it('puts the rescue handle low at the aft end, centred between the seats (§9 q26)', () => {
      const rescue = rectOf('rescueHandle');
      expect(rescue.y, 'aft of the lever row').toBeGreaterThanOrEqual(
        Math.max(...['trim', 'choke', 'throttle', 'brake'].map(bottom)),
      );
      expect(bottom('rescueHandle'), 'inside the console edge').toBeLessThanOrEqual(
        views.console.size.height,
      );
      expect(rescue.x + rescue.w / 2, 'on the centreline').toBe(views.console.size.width / 2);
    });

    // A top view, forward up, the pilot's seat on the left.
    const leverRow = ['trim', 'choke', 'throttle', 'brake'] as const;

    it('lays trim, choke, throttle and brake side by side from the pilot outward (§9 q31)', () => {
      leverRow.slice(1).forEach((id, index) => {
        const inboard = leverRow[index] ?? '';
        expect(rectOf(id).x, `${id} right of ${inboard}`).toBeGreaterThanOrEqual(right(inboard));
        expect(rectOf(id).y, `${id} level with ${inboard}`).toBe(rectOf(inboard).y);
      });
    });

    it.each(leverRow)('gives %s a fore-and-aft slot, taller than wide', (id) => {
      expect(rectOf(id).h).toBeGreaterThan(rectOf(id).w);
    });

    it('puts the parking-brake valve aft of the lever group, lower in the top view', () => {
      const levers = Math.max(...leverRow.map(bottom));
      expect(rectOf('parkingBrakeValve').y).toBeGreaterThanOrEqual(levers);
    });

    it('keeps the provisional carb heat outboard of the lever row (§9 q3)', () => {
      expect(rectOf('carbHeat').x).toBeGreaterThan(right('brake'));
    });

    it('puts the parking-brake lever on the console right side, aft of the lever row (intake §3.7)', () => {
      expect(rectOf('parkingBrakeValve').x).toBeGreaterThanOrEqual(right('brake'));
      expect(rectOf('parkingBrakeValve').y).toBeGreaterThanOrEqual(
        Math.max(...['trim', 'choke', 'throttle', 'brake'].map(bottom)),
      );
    });

    it('draws no large knob and places only the seven controls (§9 q10, q11)', () => {
      expect(viewConsole).not.toMatch(/data-knob/);
      expect(Object.keys(consoleView.rects).sort()).toEqual(
        [
          'brake',
          'carbHeat',
          'choke',
          'parkingBrakeValve',
          'rescueHandle',
          'throttle',
          'trim',
        ].sort(),
      );
    });
  });

  describe("the upper-centre plate as D-MPGO's (intake §3.9.3)", () => {
    const plate = upperPlates[1];
    if (!plate) throw new Error('the panel art draws no upper-centre plate');
    const middleX = plate.x + plate.w / 2;
    const centreX = ({ rect }: { rect: { x: number; w: number } }) => rect.x + rect.w / 2;

    it('sets the radio and the transponder side by side at the bottom, the pair centred', () => {
      const { com, xpdr, gps } = deviceSlots;
      expect(com.rect.x + com.rect.w).toBeLessThanOrEqual(xpdr.rect.x);
      expect(com.rect.y).toBe(xpdr.rect.y);
      expect(gps.rect.y + gps.rect.h).toBeLessThanOrEqual(com.rect.y);
      expect(Math.abs((com.rect.x + xpdr.rect.x + xpdr.rect.w) / 2 - middleX)).toBeLessThan(
        0.03 * plate.w,
      );
    });

    it('puts the FLARM display at the top left, above the GPS', () => {
      const { flarm, gps } = deviceSlots;
      expect(flarm.rect.y + flarm.rect.h).toBeLessThanOrEqual(gps.rect.y);
      expect(centreX(flarm)).toBeLessThan(middleX);
      expect(flarm.rect.x - plate.x).toBeLessThan(0.1 * plate.w);
    });

    it('centres the GPS under the FLARM display and the checklist card', () => {
      expect(Math.abs(centreX(deviceSlots.gps) - middleX)).toBeLessThan(0.05 * plate.w);
    });

    it('draws the GPS cradle wider than the radio pair is tall, and the FLARM the smallest unit', () => {
      const { flarm, gps, com } = deviceSlots;
      expect(gps.rect.w).toBeGreaterThan(com.rect.w);
      expect(flarm.rect.w * flarm.rect.h).toBeLessThan(com.rect.w * com.rect.h);
    });
  });

  it('keeps every device slot inside the upper-centre plate, clear of the others', () => {
    const plate = upperPlates[1];
    if (!plate) throw new Error('the panel art draws no upper-centre plate');
    const field = { x0: plate.x, y0: plate.y, x1: plate.x + plate.w, y1: plate.y + plate.h };
    const rects = Object.values(deviceSlots).map(({ rect }) => rect);
    for (const { x, y, w, h } of rects) {
      expect(x).toBeGreaterThanOrEqual(field.x0);
      expect(y).toBeGreaterThanOrEqual(field.y0);
      expect(x + w).toBeLessThanOrEqual(field.x1);
      expect(y + h).toBeLessThanOrEqual(field.y1);
    }
    rects.forEach((a, i) =>
      rects.slice(i + 1).forEach((b) => {
        const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
        expect(apart).toBe(true);
      }),
    );
  });

  it('lists the phases of a whole flight in flight order', () => {
    expect(Object.keys(expectedPhases)).toEqual(phaseOrder);
    expect(Object.keys(ctslAircraft.phases)).toEqual(phaseOrder);
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
      ignition: 'out',
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
    expect(entry).toMatchObject({ ignition: 'out', fuelValve: 'closed', brake: 'off' });
    const state = entryState('parking');
    expect(state.bus).toEqual({
      mainPowered: false,
      avionicsPowered: false,
      charging: false,
      volts: 0,
    });
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
        volts: 14,
      });
    },
  );

  it('enters parking with a dead bus', () => {
    expect(entryState('parking').bus).toEqual({
      mainPowered: false,
      avionicsPowered: false,
      charging: false,
      volts: 0,
    });
  });

  it.each([
    ['parking', 'idle'],
    ['taxiOut', 'low'],
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
    ['taxiOut', false],
    ['holding', true],
    ['linedUp', false],
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

  it('has a non-locking brake lever that every procedure only pulls and holds', () => {
    expect(ctslAircraft.controls.brake?.kind).toBe('momentary');
    const brakeActions = Object.values(ctslAircraft.procedures).flatMap(({ items }) =>
      items.filter((item) => item.type === 'action' && item.control === 'brake'),
    );
    expect(brakeActions.length).toBeGreaterThan(0);
    for (const item of brakeActions) {
      expect(item.type === 'action' && item.position, item.text.en).toBe('on');
      expect(item.text.en, item.text.en).toMatch(/held|hold/i);
    }
  });

  it.each(Object.keys(expectedPhases))('enters %s with the generator lamp out', (id) => {
    const state: CtslTrainerState = {
      controls: ctslAircraft.phases[id]?.entry.controls ?? {},
      guards: {},
      systems: entryState(id),
      devices: {},
    };
    expect(chargeLampLit(state)).toBe(false);
  });

  it.each([
    [{ mainPowered: true, avionicsPowered: false, charging: false, volts: 12 }, true],
    [{ mainPowered: true, avionicsPowered: false, charging: true, volts: 14 }, false],
    [{ mainPowered: false, avionicsPowered: false, charging: false, volts: 0 }, false],
  ])('lights the generator lamp only on a powered bus that is not charging: %o', (bus, lit) => {
    const systems = { ...entryState('parking'), bus };
    expect(chargeLampLit({ controls: {}, guards: {}, systems, devices: {} })).toBe(lit);
  });

  it.each([
    ['taxiOut', '0'],
    ['holding', '0'],
    ['linedUp', '15'],
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

  it('declares every failure of the plan, only the flap control failure tripping a breaker', () => {
    expect(Object.keys(ctslAircraft.failures)).toEqual([
      'generatorFailure',
      'engineStoppage',
      'engineFire',
      'coolantLoss',
      'oilLoss',
      'flapControlFailure',
    ]);
    expect(
      Object.fromEntries(
        Object.entries(ctslAircraft.failures).flatMap(([id, failure]) =>
          failure.trips ? [[id, failure.trips]] : [],
        ),
      ),
    ).toEqual({ flapControlFailure: ['flapBreaker'] });
  });

  it('shows smoke from the engine in the outside view exactly while the fire burns', () => {
    const cues = ctslAircraft.outsideCues ?? {};
    expect(Object.keys(cues)).toEqual(['engineSmoke']);
    const smoke = cues['engineSmoke'];
    const session = createSession(ctslAircraft, { devices, phase: 'cruise' });
    expect(smoke?.shows(session.state())).toBe(false);
    session.startProcedure('engineFire');
    session.advance(STEP_MS);
    expect(smoke?.shows(session.state())).toBe(true);
    session.set('fuelValve', 'closed');
    session.set('ignition', 'off');
    for (let ms = 0; ms < 2000; ms += STEP_MS) session.advance(STEP_MS);
    expect((session.state().systems as CtslState).fire).toBe(false);
    expect(smoke?.shows(session.state())).toBe(false);
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
    ['taxiOut', 'in', 'closed'],
    ['holding', 'in', 'closed'],
    ['linedUp', 'out', 'open'],
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

  it.each(Object.keys(expectedPhases))(
    'enters %s with the cockpit light off (day VFR only)',
    (id) => {
      expect(ctslAircraft.phases[id]?.entry.controls.cockpitLight).toBe('off');
      expect(entryState(id).consumers.cockpitLight).toBe(false);
    },
  );

  it.each(Object.keys(expectedPhases).filter((id) => id !== 'parking'))(
    'enters %s with the avionics, beacon and intercom on while the engine runs',
    (id) => {
      expect(ctslAircraft.phases[id]?.entry.controls).toMatchObject({
        avionicsMaster: 'on',
        beacon: 'on',
        intercom: 'on',
      });
      expect(entryState(id).consumers).toMatchObject({ beacon: true, intercom: true });
    },
  );

  it.each([
    ['parking', 'off'],
    ['taxiOut', 'off'],
    ['holding', 'off'],
    ['linedUp', 'off'],
    ['departure', 'off'],
    ['cruise', 'off'],
    ['approach', 'on'],
    ['landing', 'on'],
    ['taxiIn', 'on'],
    ['parkingSecuring', 'off'],
  ])('enters %s with the landing light %s', (id, light) => {
    expect(ctslAircraft.phases[id]?.entry.controls.landingLight).toBe(light);
    expect(entryState(id).consumers.landingLight).toBe(light === 'on');
  });

  it.each(Object.keys(expectedPhases).filter((id) => !['parking', 'holding'].includes(id)))(
    'enters %s rolling or flying, with the parking-brake valve at Off',
    (id) => {
      expect(ctslAircraft.phases[id]?.entry.controls.parkingBrakeValve).toBe('open');
      expect(entryState(id).parkingBrakeSet).toBe(false);
    },
  );

  it.each(Object.keys(expectedPhases))('presets no device control on entering %s', (id) => {
    expect(ctslAircraft.phases[id]?.entry.devices).toBeUndefined();
  });

  it.each([
    ['parking', false, 'stby'],
    ['taxiOut', false, 'stby'],
    ['holding', false, 'stby'],
    ['linedUp', true, 'acs'],
    ['departure', true, 'acs'],
    ['cruise', true, 'acs'],
    ['approach', true, 'acs'],
    ['landing', true, 'acs'],
    ['taxiIn', true, 'acs'],
    ['parkingSecuring', true, 'stby'],
  ] as const)('enters %s with the transponder on: %s, in mode %s', (phase, on, mode) => {
    const session = createSession(ctslAircraft, { devices, phase });
    expect(session.state().devices.xpdr?.state).toMatchObject({ on, mode });
  });

  it.each([
    ['parking', '2000'],
    ['taxiOut', '2000'],
    ['holding', '2000'],
    ['linedUp', '7000'],
    ['departure', '7000'],
    ['cruise', '7000'],
    ['approach', '7000'],
    ['landing', '7000'],
    ['taxiIn', '7000'],
    ['parkingSecuring', '7000'],
  ])('enters %s with the transponder squawking %s', (phase, squawk) => {
    const session = createSession(ctslAircraft, { devices, phase });
    expect(session.state().devices.xpdr?.state).toMatchObject({ squawk });
  });

  it.each([
    ['parking', undefined],
    ['taxiOut', undefined],
    ['holding', undefined],
    ['linedUp', 'map'],
    ['departure', 'map'],
    ['cruise', 'map'],
    ['approach', 'map'],
    ['landing', 'map'],
    ['taxiIn', 'map'],
    ['parkingSecuring', 'map'],
  ])('enters %s with the GPS seeded at page %s, already powered and fixed', (phase, page) => {
    const seed = ctslAircraft.phases[phase]?.entry.deviceStates?.gps;
    expect(seed).toEqual(
      page === undefined ? undefined : { on: true, powered: true, page, fix: true },
    );
  });

  it.each([
    ['parking', false],
    ['taxiOut', false],
    ['holding', false],
    ['linedUp', true],
    ['departure', true],
    ['cruise', true],
    ['approach', true],
    ['landing', true],
    ['taxiIn', true],
    ['parkingSecuring', true],
  ])('enters %s with the FLARM seeded past its self-test and search: %s', (phase, seeded) => {
    const seed = ctslAircraft.phases[phase]?.entry.deviceStates?.flarm;
    expect(seed).toEqual(seeded ? { powered: true, stage: 'ready', fix: true } : undefined);
  });

  it.each(['linedUp', 'cruise', 'parkingSecuring'])(
    'enters %s with the GPS on its map page with a fix and the FLARM operational',
    (phase) => {
      const session = createSession(ctslAircraft, { devices, phase });
      expect(session.state().devices.gps?.state).toMatchObject({
        on: true,
        page: 'map',
        fix: true,
      });
      expect(session.state().devices.flarm?.state).toMatchObject({ operational: true });
    },
  );

  it('enters the holding point with the GPS at its start-up page and parking with it dark', () => {
    const at = (phase: string) =>
      createSession(ctslAircraft, { devices, phase }).state().devices.gps?.state;
    expect(at('parking')).toMatchObject({ on: false });
    expect(at('holding')).toMatchObject({ on: true, page: 'startup' });
  });

  it.each([
    ['parking', false],
    ['taxiOut', true],
    ['holding', true],
    ['linedUp', true],
    ['departure', true],
    ['cruise', true],
    ['approach', true],
    ['landing', true],
    ['taxiIn', true],
    ['parkingSecuring', true],
  ])('enters %s with the COM radio switched on, as N3 leaves it: %s', (phase, on) => {
    const seed = ctslAircraft.phases[phase]?.entry.deviceStates?.com;
    expect(seed).toEqual(on ? { on: true, powered: true } : undefined);
  });

  it('switches the COM radio on only with an I/O press, not with the avionics bus', () => {
    const session = createSession(ctslAircraft, { devices, phase: 'parking' });
    session.set('battery', 'in');
    session.set('avionicsMaster', 'on');
    session.advance(100);
    expect(session.state().devices.com?.state).toMatchObject({ powered: true, on: false });
    session.press('com.power');
    session.advance(100);
    session.release('com.power');
    session.advance(100);
    expect(session.state().devices.com?.state).toMatchObject({ on: true });
  });

  it.each([
    ['departure', 'climbing', 1],
    ['approach', 'descending', -1],
  ])('enters %s %s on the vertical speed indicator', (id, _trend, sign) => {
    expect(Math.sign(entryState(id).verticalSpeedMs)).toBe(sign);
  });

  it.each(Object.keys(expectedPhases).filter((id) => !['departure', 'approach'].includes(id)))(
    'enters %s with a level vertical speed indicator',
    (id) => {
      expect(entryState(id).verticalSpeedMs).toBe(0);
    },
  );

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
