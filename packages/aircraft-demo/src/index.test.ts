import {
  CONTRACT_VERSION,
  STEP_MS,
  createSession,
  validateAircraft,
  walkProcedure,
} from '@cpt/core';
import type { ControlKind, Session } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import viewConsole from './assets/view-console.svg?raw';
import viewPanel from './assets/view-panel.svg?raw';
import { demoAircraft } from './index';
import type { DemoState } from './systems';
import { testDevices as devices } from './test-devices';

type Rect = { x: number; y: number; w: number; h: number };

const CONTROL_KINDS: readonly ControlKind[] = [
  'toggle',
  'rotary',
  'lever',
  'momentary',
  'guarded',
  'breaker',
];

const systems = (session: Session) => session.state().systems as DemoState;
const reading = (session: Session, indicator: string) =>
  demoAircraft.indicators[indicator]?.select(session.state());
const run = (session: Session, ms: number) => {
  for (let elapsed = 0; elapsed < ms; elapsed += STEP_MS) session.advance(STEP_MS);
};

function readyToStart(overrides: Record<string, string | number> = {}): Session {
  const session = createSession(demoAircraft, { devices, phase: 'parking' });
  const settings = {
    fuelSelector: 'both',
    mixture: 1,
    battery: 'on',
    magnetos: 'both',
    ...overrides,
  };
  for (const [control, position] of Object.entries(settings)) session.set(control, position);
  return session;
}

describe('demo aircraft', () => {
  it('targets the current contract', () => {
    expect(demoAircraft.contractVersion).toBe(CONTRACT_VERSION);
  });

  it('states its handbook revision in both languages', () => {
    expect(demoAircraft.handbookRevision).toEqual({
      de: 'Fiktives Flugzeug; kein Handbuch',
      en: 'fictional aircraft; no handbook',
    });
  });

  it('passes the validator', () => {
    expect(validateAircraft(demoAircraft, { devices })).toEqual([]);
  });

  it('arranges every view in the cockpit and places a dock', () => {
    expect(Object.keys(demoAircraft.cockpit?.views ?? {}).sort()).toEqual(
      Object.keys(demoAircraft.views).sort(),
    );
    expect(demoAircraft.cockpit?.dock).toBeDefined();
  });

  it('uses every control kind and springs one rotary detent back', () => {
    const controls = Object.values(demoAircraft.controls);
    expect(new Set(controls.map((control) => control.kind))).toEqual(new Set(CONTROL_KINDS));
    expect(controls.some((control) => control.kind === 'rotary' && control.springBack)).toBe(true);
  });

  it('declares only generic widgets', () => {
    const appearances = [
      ...Object.values(demoAircraft.controls),
      ...Object.values(demoAircraft.indicators),
    ].map((definition) => definition.appearance);
    for (const appearance of appearances) {
      expect(appearance).toBeDefined();
      expect(appearance).not.toHaveProperty('artwork');
    }
  });

  it('has a panel and a console and phases for the parked, taxiing and flying situations', () => {
    expect(Object.keys(demoAircraft.views)).toEqual(['panel', 'console']);
    expect(Object.keys(demoAircraft.phases).length).toBeGreaterThanOrEqual(3);
    for (const phase of Object.values(demoAircraft.phases)) expect(phase.image).not.toBe('');
  });

  it('lists the phases of a whole flight in flight order', () => {
    expect(Object.keys(demoAircraft.phases)).toEqual([
      'parking',
      'taxiOut',
      'holding',
      'linedUp',
      'departure',
      'cruise',
      'approach',
      'landing',
      'taxiIn',
      'parkingSecuring',
    ]);
  });

  it.each(Object.keys(demoAircraft.phases).filter((id) => id !== 'parking'))(
    'enters the %s phase with the engine running',
    (id) => {
      const session = createSession(demoAircraft, { devices, phase: id });
      expect(systems(session).engine.running).toBe(true);
      run(session, STEP_MS);
      expect(systems(session).engine.running).toBe(true);
    },
  );

  it('enters taxiOut on taxi power with the flaps up, on the ground at rest', () => {
    const taxiOut = demoAircraft.phases.taxiOut;
    expect(taxiOut?.entry.controls).toMatchObject({ throttle: 0.15, flaps: 'up' });
    expect(taxiOut?.environment).toEqual({ airspeedKt: 0, altitudeFt: 0, onGround: true });
  });

  it('ends the engine start in taxiOut, so a full flight goes on from the taxiway', () => {
    expect(demoAircraft.procedures.engineStart).toMatchObject({
      startPhase: 'parking',
      endPhase: 'taxiOut',
    });
  });

  it('ends the shutdown with the controls of the cold parked aircraft and a dead bus', () => {
    const session = createSession(demoAircraft, { devices, phase: 'parkingSecuring' });
    session.startProcedure('shutdownSecuring');
    for (const item of demoAircraft.procedures.shutdownSecuring?.items ?? []) {
      if (item.type === 'action' && session.state().controls[item.control] !== item.position) {
        session.set(item.control, item.position);
      } else session.checkOff();
    }
    expect(session.checklist()).toMatchObject({ done: true, deviations: [] });
    expect(session.state().controls).toMatchObject(
      demoAircraft.phases.parking?.entry.controls ?? {},
    );
    expect(systems(session).engine.running).toBe(false);
    expect(systems(session).bus.busPowered).toBe(false);
  });

  it('keeps the magneto key and the starter on separate controls', () => {
    expect(demoAircraft.controls.magnetos?.kind).toBe('rotary');
    expect(demoAircraft.controls.starter?.kind).toBe('momentary');
  });

  it('runs the engine after a correct start', () => {
    const session = readyToStart({ alternator: 'on' });
    session.press('starter');
    run(session, 3000);
    expect(systems(session).engine.running).toBe(true);
    session.release('starter');
    run(session, 500);
    expect(systems(session).engine.running).toBe(true);
    expect(systems(session).amps).toBeGreaterThan(0);
  });

  it('turns the engine but does not start it with the magnetos off', () => {
    const session = readyToStart({ magnetos: 'off' });
    session.press('starter');
    run(session, 5000);
    expect(systems(session).engine.running).toBe(false);
    expect(systems(session).rpm).toBeGreaterThan(0);
  });

  it('leaves the starter unpowered and the engine stopped without the battery', () => {
    const session = readyToStart({ battery: 'off' });
    session.press('starter');
    run(session, 5000);
    expect(systems(session).engine.running).toBe(false);
    expect(systems(session).rpm).toBe(0);
  });

  it('does not start with the mixture at idle cut-off', () => {
    const session = readyToStart({ mixture: 0 });
    session.press('starter');
    run(session, 5000);
    expect(systems(session).engine.running).toBe(false);
  });

  it('stops a running engine when the mixture is pulled to idle cut-off', () => {
    const session = createSession(demoAircraft, { devices, phase: 'holding' });
    run(session, STEP_MS);
    expect(systems(session).engine.running).toBe(true);
    session.set('mixture', 0);
    expect(systems(session).engine.running).toBe(false);
  });

  describe('with the engine running', () => {
    const running = (): Session => createSession(demoAircraft, { devices, phase: 'holding' });

    it('lights the lamps only while the annunciator switch is held at test', () => {
      const session = running();
      expect(reading(session, 'lowVoltageLamp')).toBe(false);
      expect(reading(session, 'oilPressureLamp')).toBe(false);
      session.press('annunciator', 'test');
      expect(reading(session, 'lowVoltageLamp')).toBe(true);
      expect(reading(session, 'oilPressureLamp')).toBe(true);
      session.release('annunciator');
      expect(reading(session, 'lowVoltageLamp')).toBe(false);
      expect(reading(session, 'oilPressureLamp')).toBe(false);
    });

    it('stops when the fuel shut-off is closed', () => {
      const session = running();
      session.openGuard('fuelShutoff');
      session.set('fuelShutoff', 'shut');
      expect(systems(session).engine.running).toBe(false);
    });

    it('stops when the fuel selector is turned off', () => {
      const session = running();
      session.set('fuelSelector', 'off');
      expect(systems(session).engine.running).toBe(false);
    });

    it('does not charge with the alternator breaker pulled', () => {
      const session = running();
      session.advance(STEP_MS);
      expect(systems(session).bus.charging).toBe(true);
      session.set('alternatorBreaker', 'pulled');
      expect(systems(session).bus.charging).toBe(false);
      expect(reading(session, 'lowVoltageLamp')).toBe(true);
    });

    it('unpowers the avionics with the avionics breaker pulled', () => {
      const session = running();
      expect(systems(session).avionicsPowered).toBe(true);
      session.set('avionicsBreaker', 'pulled');
      expect(systems(session).avionicsPowered).toBe(false);
    });

    it('loses rpm on a single magneto and recovers on both', () => {
      const session = running();
      session.set('throttle', 1);
      const both = systems(session).rpm;
      session.set('magnetos', 'right');
      const right = systems(session).rpm;
      expect(right).toBeLessThan(both);
      expect(both - right).toBeLessThanOrEqual(150);
      session.set('magnetos', 'left');
      expect(systems(session).rpm).toBe(right);
      session.set('magnetos', 'both');
      expect(systems(session).rpm).toBe(both);
    });
  });

  describe('alternator failure', () => {
    it('trips its breaker and lights the low-voltage lamp', () => {
      const session = createSession(demoAircraft, { devices, phase: 'cruise' });
      expect(reading(session, 'lowVoltageLamp')).toBe(false);
      expect(session.state().controls.alternatorBreaker).toBe('in');

      session.startProcedure('alternatorFailure');
      run(session, STEP_MS);
      expect(session.state().controls.alternatorBreaker).toBe('pulled');
      expect(reading(session, 'lowVoltageLamp')).toBe(true);
      expect(systems(session).amps).toBeLessThan(0);
    });

    it('opens with the recognition and the breaker reset as memory items', () => {
      const items = demoAircraft.procedures.alternatorFailure?.items ?? [];
      expect(items.map((item) => item.memory === true)).toEqual([
        true,
        true,
        true,
        false,
        false,
        false,
        false,
      ]);
    });

    it('stays failed after the breaker is reset', () => {
      const session = createSession(demoAircraft, { devices, phase: 'cruise' });
      session.startProcedure('alternatorFailure');
      session.set('alternatorBreaker', 'in');
      run(session, STEP_MS);
      expect(reading(session, 'lowVoltageLamp')).toBe(true);
    });
  });

  it.each(Object.keys(demoAircraft.procedures))('walks %s with no deviations', (id) => {
    expect(walkProcedure(demoAircraft, id, { devices })).toEqual({ ok: true });
  });

  describe('the before-landing flow', () => {
    const items = demoAircraft.procedures.beforeLanding?.items ?? [];
    const flow = items.flatMap((item) => (item.type === 'action' && item.flow ? [item] : []));

    it('opens the procedure and is verified by the checklist after it', () => {
      expect(flow.map(({ control, position }) => [control, position])).toEqual([
        ['fuelSelector', 'both'],
        ['mixture', 1],
        ['flaps', 'takeoff'],
      ]);
      expect(items.slice(0, flow.length)).toEqual(flow);
      const rest = items.slice(flow.length);
      for (const { control } of flow) {
        const verified = rest.some(
          (item) =>
            (item.type === 'action' && item.control === control) ||
            (item.type === 'check' &&
              item.target !== undefined &&
              'control' in item.target &&
              item.target.control === control),
        );
        expect(verified, control).toBe(true);
      }
    });

    it('needs the pilot to set its mixture and flaps targets on entry', () => {
      const session = createSession(demoAircraft, { devices, phase: 'approach' });
      session.startProcedure('beforeLanding');
      expect(session.state().controls).not.toMatchObject({ mixture: 1 });
      expect(session.state().controls).not.toMatchObject({ flaps: 'takeoff' });
      expect(session.checklist()?.completed).toEqual([0]);
    });

    it.each(['listed', 'reversed'] as const)('walks green in the %s order', (flowOrder) => {
      expect(walkProcedure(demoAircraft, 'beforeLanding', { devices, flowOrder })).toEqual({
        ok: true,
      });
    });
  });

  it('has seven normal procedures and an emergency naming its failure', () => {
    const procedures = Object.values(demoAircraft.procedures);
    expect(procedures.filter((procedure) => procedure.type === 'normal')).toHaveLength(7);
    const emergencies = procedures.filter((procedure) => procedure.type === 'emergency');
    expect(emergencies).toHaveLength(1);
    expect(emergencies[0]?.failure).toBe('alternatorFailure');
  });
});

describe('installed devices', () => {
  const holding = () => createSession(demoAircraft, { devices, phase: 'holding' });
  const installed = Object.entries(demoAircraft.devices ?? {});

  it('installs the COM radio and the transponder', () => {
    expect(installed.map(([, install]) => install.device).sort()).toEqual(['com', 'transponder']);
  });

  it('places every install on a view of the aircraft', () => {
    for (const [, install] of installed) expect(demoAircraft.views[install.view]).toBeDefined();
  });

  it('powers both devices from the avionics bus', () => {
    const session = holding();
    for (const [id] of installed) expect(session.state().devices[id]?.on).toBe(true);

    session.set('avionics', 'off');
    for (const [id] of installed) expect(session.state().devices[id]?.on).toBe(false);

    session.set('avionics', 'on');
    session.set('avionicsBreaker', 'pulled');
    for (const [id] of installed) expect(session.state().devices[id]?.on).toBe(false);
  });

  it('powers neither device with the battery off', () => {
    const session = createSession(demoAircraft, { devices, phase: 'parking' });
    session.set('avionics', 'on');
    for (const [id] of installed) expect(session.state().devices[id]?.on).toBe(false);
  });

  it.each(
    Object.entries(demoAircraft.phases)
      .filter(([, phase]) => !phase.environment.onGround)
      .map(([id]) => id),
  )('carries the altitude of the %s environment in its entry snapshot', (id) => {
    const phase = demoAircraft.phases[id];
    expect((phase?.entry.state as DemoState).altitudeFt).toBe(phase?.environment.altitudeFt);
    expect(phase?.environment.altitudeFt).toBeGreaterThan(0);
  });

  it('feeds the pressure altitude of the phase to the transponder', () => {
    const session = createSession(demoAircraft, { devices, phase: 'cruise' });
    session.set('xpdr.mode', 'alt');
    expect(session.state().devices.xpdr?.state).toMatchObject({ altitude: 4500 });
  });
});

describe('declared view sizes', () => {
  const sources: Record<string, string> = {
    panel: viewPanel,
    console: viewConsole,
  };

  it.each(Object.keys(sources))('view %s matches the viewBox of its image', (id) => {
    const match = /viewBox="([^"]+)"/.exec(sources[id] ?? '');
    const [x, y, width, height] = (match?.[1] ?? '').split(/[\s,]+/).map(Number);
    expect([x, y]).toEqual([0, 0]);
    expect(demoAircraft.views[id]?.size).toEqual({ width, height });
  });

  it.each(Object.keys(sources))('view %s uses at most one filter, for its texture', (id) => {
    const source = sources[id] ?? '';
    expect(source.match(/<filter\b/g)?.length ?? 0).toBeLessThanOrEqual(1);
    expect(source.match(/filter="url\(/g)?.length ?? 0).toBeLessThanOrEqual(1);
  });

  it('keeps the RADIO legend and both slot recesses where the devices sit', () => {
    expect(viewPanel).toMatch(/<text x="106" y="696" [^>]*font-size="30"[^>]*>RADIO<\/text>/);
    for (const x of [184, 724]) {
      expect(viewPanel).toContain(`<rect x="${x}" y="598" width="540" height="162" rx="10"`);
    }
  });
});

describe('radio section layout', () => {
  const panel = demoAircraft.views.panel;
  const slots = Object.entries(demoAircraft.devices ?? {}).map(
    ([id, install]) => [id, install.placement.rect] as const,
  );
  const clash = (a: Rect, b: Rect) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  it('installs every device in the panel', () => {
    for (const install of Object.values(demoAircraft.devices ?? {})) {
      expect(install.view).toBe('panel');
    }
  });

  it('sets the two slots side by side in one row', () => {
    const [[, radio], [, xpdr]] = slots as [(typeof slots)[number], (typeof slots)[number]];
    expect(radio.x + radio.w).toBeLessThanOrEqual(xpdr.x);
    expect(radio.y).toBe(xpdr.y);
  });

  it('keeps each slot inside the panel and clear of every control and indicator', () => {
    const others = [
      ...Object.entries(panel?.controls ?? {}),
      ...Object.entries(panel?.indicators ?? {}),
    ];
    for (const [id, rect] of slots) {
      expect(rect.x + rect.w, `${id} right`).toBeLessThanOrEqual(panel?.size?.width ?? 0);
      expect(rect.y + rect.h, `${id} bottom`).toBeLessThanOrEqual(panel?.size?.height ?? 0);
      expect(
        others.filter(([, other]) => other && clash(rect, other.rect)).map(([name]) => name),
      ).toEqual([]);
    }
  });
});

describe('the annunciator test item of the engine start', () => {
  function atAnnunciator(): Session {
    const session = createSession(demoAircraft, { devices, phase: 'parking' });
    session.startProcedure('engineStart');
    session.checkOff();
    session.checkOff();
    for (const [control, position] of [
      ['fuelSelector', 'both'],
      ['mixture', 1],
      ['battery', 'on'],
      ['alternator', 'on'],
    ] as const) {
      session.set(control, position);
    }
    expect(session.checklist()?.current).toBe(6);
    return session;
  }

  it('does not complete on a click', () => {
    const session = atAnnunciator();
    session.press('annunciator', 'test');
    session.release('annunciator');
    run(session, 3000);
    expect(session.checklist()?.current).toBe(6);
  });

  it('does not complete on a hold that is let go early', () => {
    const session = atAnnunciator();
    session.press('annunciator', 'test');
    run(session, 400);
    session.release('annunciator');
    run(session, 3000);
    expect(session.checklist()?.current).toBe(6);
  });

  it('completes once the switch has been held long enough', () => {
    const session = atAnnunciator();
    session.press('annunciator', 'test');
    run(session, 3000);
    expect(session.checklist()?.current).toBe(7);
  });

  it('starts the hold over after a release', () => {
    const session = atAnnunciator();
    session.press('annunciator', 'test');
    run(session, 400);
    session.release('annunciator');
    session.press('annunciator', 'test');
    run(session, 400);
    expect(session.checklist()?.current).toBe(6);
  });
});

describe('the radio and transponder self-check', () => {
  it('records an unmet check when it is ticked with the avionics off', () => {
    const session = createSession(demoAircraft, { devices });
    session.startProcedure('radioAndTransponder');
    session.set('avionics', 'off');
    session.checkOff();
    expect(session.checklist()?.deviations).toEqual([{ kind: 'unmet-check', itemIndex: 0 }]);
  });
});
