import { describe, expect, it } from 'vitest';
import type { JsonObject } from '@cpt/core';
import {
  cycleHz,
  firingHz,
  pistonEngineDefaults,
  pistonEngineModel,
  pistonEngineOptions,
  pistonEngineProblems,
  power,
  windmilling,
} from './piston-engine-model';
import type {
  PistonEngineEdge,
  PistonEngineInputName,
  PistonEngineModelInput,
  PistonEngineModelState,
  PistonEngineOptions,
} from './piston-engine-model';

const OPTIONS: PistonEngineOptions = {
  cylinders: 4,
  idleRpm: 1400,
  maxContinuousRpm: 5500,
  crankingRpm: 300,
  throttleUpMs: 500,
  throttleDownMs: 900,
  catchMs: 200,
  runDownMs: 2000,
  windMs: 600,
};
const REQUIRED: JsonObject = { cylinders: 4, idleRpm: 1400, maxContinuousRpm: 5500 };
const TICK_MS = 100;
const SETTLE_MS = 20 * OPTIONS.runDownMs;
const ALL: readonly PistonEngineInputName[] = ['rpm', 'running', 'starter'];
const model = pistonEngineModel(OPTIONS);

type Controls = Omit<PistonEngineModelInput, 'jump'>;
const PARKED: Controls = { rpm: 0, running: false, starter: false };

/** Drives the model as a voice does: one step per notification, dt from an injected clock. */
const cockpit = (start: PistonEngineModelState = model.initial) => {
  let nowMs = 0;
  let lastMs = 0;
  let state = start;
  let held: Controls = {
    rpm: start.input.rpm,
    running: start.input.running,
    starter: start.input.starter,
  };
  const edges: PistonEngineEdge[] = [];
  const notify = (jump: readonly PistonEngineInputName[]) => {
    state = model.step(state, { ...held, jump }, nowMs - lastMs);
    lastMs = nowMs;
    edges.push(...state.edges);
  };
  return {
    state: () => state,
    edges,
    set(change: Partial<Controls>, jump: readonly PistonEngineInputName[] = []) {
      held = { ...held, ...change };
      notify(jump);
      return state;
    },
    advance(ms: number, tickMs = TICK_MS) {
      for (let elapsed = 0; elapsed < ms; elapsed += tickMs) {
        nowMs += tickMs;
        notify([]);
      }
      return state;
    },
  };
};

/** A cockpit already in `controls`, as a phase load leaves it. */
const loaded = (controls: Partial<Controls>) => {
  const c = cockpit();
  c.set(controls, ALL);
  c.edges.length = 0;
  return c;
};

const towards = (from: number, target: number, timeConstants = 1) =>
  target + (from - target) * Math.exp(-timeConstants);

describe('pistonEngineProblems', () => {
  it('accepts the required options and fills the rest from the voice defaults', () => {
    expect(pistonEngineProblems(REQUIRED)).toEqual([]);
    expect(pistonEngineOptions(REQUIRED)).toEqual({ ...pistonEngineDefaults, ...REQUIRED });
  });

  it('accepts every option set explicitly', () => {
    expect(pistonEngineProblems(OPTIONS)).toEqual([]);
    expect(pistonEngineOptions(OPTIONS)).toEqual(OPTIONS);
  });

  it.each(['cylinders', 'idleRpm', 'maxContinuousRpm'])('rejects a missing %s', (key) => {
    const options = Object.fromEntries(Object.entries(REQUIRED).filter(([name]) => name !== key));
    expect(pistonEngineProblems(options)).toEqual([`missing option ${key}`]);
  });

  it.each<[string, JsonObject]>([
    ['cylinders', { cylinders: 0 }],
    ['cylinders', { cylinders: 2.5 }],
    ['cylinders', { cylinders: '4' }],
    ['idleRpm', { idleRpm: 0 }],
    ['idleRpm', { idleRpm: Number.POSITIVE_INFINITY }],
    ['maxContinuousRpm', { maxContinuousRpm: 1400 }],
    ['maxContinuousRpm', { maxContinuousRpm: null }],
    ['crankingRpm', { crankingRpm: 0 }],
    ['crankingRpm', { crankingRpm: 1400 }],
    ['throttleUpMs', { throttleUpMs: 0 }],
    ['throttleDownMs', { throttleDownMs: -1 }],
    ['catchMs', { catchMs: Number.NaN }],
    ['runDownMs', { runDownMs: [2000] }],
    ['windMs', { windMs: false }],
  ])('rejects an out-of-range %s', (key, change) => {
    const problems = pistonEngineProblems({ ...REQUIRED, ...change });
    expect(problems).toContain(`option ${key} is out of range`);
    expect(() => pistonEngineOptions({ ...REQUIRED, ...change })).toThrow(key);
  });

  it.each<JsonObject>([{ cylinders: 1 }, { maxContinuousRpm: 1401 }, { crankingRpm: 1399 }])(
    'accepts %o at the edge of its range',
    (change) => {
      expect(pistonEngineProblems({ ...REQUIRED, ...change })).toEqual([]);
    },
  );

  it('names a default that the aircraft options put out of range', () => {
    const idleRpm = pistonEngineDefaults.crankingRpm - 50;
    expect(pistonEngineProblems({ ...REQUIRED, idleRpm })).toEqual([
      `default crankingRpm ${pistonEngineDefaults.crankingRpm} is out of range`,
    ]);
    expect(pistonEngineProblems({ ...REQUIRED, idleRpm, crankingRpm: idleRpm - 1 })).toEqual([]);
  });

  it('reports every bad option, and checks the rpm order once idleRpm is valid', () => {
    const bad = { cylinders: 4, idleRpm: 0 };
    expect(pistonEngineProblems({ ...bad, maxContinuousRpm: -1 })).toEqual([
      'option idleRpm is out of range',
      'option maxContinuousRpm is out of range',
    ]);
    expect(pistonEngineProblems({ ...bad, maxContinuousRpm: 1000 })).toEqual([
      'option idleRpm is out of range',
    ]);
  });

  it('rejects an option the voice does not know', () => {
    expect(pistonEngineProblems({ ...REQUIRED, blades: 3 })).toEqual(['unknown option blades']);
  });

  it('gives the catch the shortest and the run-down the longest default time constant', () => {
    const { catchMs, runDownMs, throttleUpMs, throttleDownMs, windMs } = pistonEngineDefaults;
    for (const other of [throttleUpMs, throttleDownMs, windMs]) {
      expect(catchMs).toBeLessThan(other);
      expect(runDownMs).toBeGreaterThan(other);
    }
  });
});

describe('frequency and power targets', () => {
  it('runs one four-stroke cycle per two revolutions and fires each cylinder once a cycle', () => {
    expect(cycleHz(4800)).toBe(40);
    expect(firingHz(4800, 4)).toBe(160);
    expect(firingHz(3000, 6)).toBe(150);
    expect(firingHz(2400, 3)).toBe(60);
  });

  it('shares power between idle and maximum continuous rpm', () => {
    expect(power(0, OPTIONS)).toBe(0);
    expect(power(1400, OPTIONS)).toBe(0);
    expect(power(3450, OPTIONS)).toBe(0.5);
    expect(power(5500, OPTIONS)).toBe(1);
    expect(power(5800, OPTIONS)).toBe(1);
  });

  it('changes the frequency target by the rpm ratio on a magneto drop', () => {
    const c = loaded({ rpm: 4000, running: true });
    const both = c.state().rpm;
    c.set({ rpm: 3850 });
    expect(c.advance(OPTIONS.throttleDownMs).rpm).toBeCloseTo(towards(both, 3850));
    const left = c.advance(SETTLE_MS).rpm;
    expect(cycleHz(left) / cycleHz(both)).toBeCloseTo(3850 / 4000, 6);
    expect(firingHz(left, OPTIONS.cylinders)).toBeCloseTo((3850 / 60) * (4 / 2), 6);
    expect(c.edges).toEqual([]);
  });
});

describe('pistonEngineModel', () => {
  it('starts stopped and silent', () => {
    expect(model.initial).toEqual({
      rpm: 0,
      firing: 0,
      starter: 0,
      catching: false,
      input: { rpm: 0, running: false, starter: false },
      edges: [],
    });
  });

  it('follows the throttle up and down at their own time constants', () => {
    const c = loaded({ rpm: OPTIONS.idleRpm, running: true });
    c.set({ rpm: 4000 });
    expect(c.advance(OPTIONS.throttleUpMs).rpm).toBeCloseTo(towards(OPTIONS.idleRpm, 4000));
    c.advance(SETTLE_MS);
    c.set({ rpm: OPTIONS.idleRpm });
    expect(c.advance(OPTIONS.throttleDownMs).rpm).toBeCloseTo(towards(4000, OPTIONS.idleRpm), 3);
    expect(c.edges).toEqual([]);
  });

  it.each<[string, Partial<Controls>, Partial<Controls>]>([
    ['a rising throttle', { rpm: OPTIONS.idleRpm, running: true }, { rpm: 4000 }],
    ['a run-down', { rpm: OPTIONS.idleRpm, running: true }, { rpm: 0, running: false }],
    ['a starter winding a stopped engine', {}, { starter: true }],
  ])('reaches the same values through %s whatever the tick', (_, from, change) => {
    const after = (tickMs: number) => {
      const c = loaded(from);
      c.set(change);
      return c.advance(OPTIONS.throttleUpMs, tickMs);
    };
    const coarse = after(OPTIONS.throttleUpMs);
    for (const tickMs of [10, TICK_MS]) {
      const fine = after(tickMs);
      expect(fine.rpm).toBeCloseTo(coarse.rpm, 6);
      expect(fine.firing).toBeCloseTo(coarse.firing, 6);
      expect(fine.starter).toBeCloseTo(coarse.starter, 6);
    }
  });

  it.each([0, -TICK_MS, Number.NaN])('holds every smoothed value for a dt of %s', (dtMs) => {
    const c = loaded({ rpm: OPTIONS.idleRpm, running: true });
    c.set({ rpm: 4000, starter: true });
    const from = c.advance(TICK_MS);
    const held = model.step(from, { ...from.input, jump: [] }, dtMs);
    expect(held).toMatchObject({ rpm: from.rpm, firing: from.firing, starter: from.starter });
    const next = model.step(held, { ...held.input, jump: [] }, OPTIONS.throttleUpMs);
    expect(next.rpm).toBeCloseTo(towards(from.rpm, 4000));
  });

  it('settles every target after a long gap between notifications', () => {
    const c = loaded({ rpm: OPTIONS.idleRpm, running: true });
    const from = c.set({ rpm: 4000, starter: true });
    const later = model.step(from, { ...from.input, jump: [] }, 60_000);
    expect(later.rpm).toBeCloseTo(4000);
    expect(later.firing).toBeCloseTo(1);
    expect(later.starter).toBeCloseTo(1);
  });

  describe('edges in one frame', () => {
    it.each<[string, Partial<Controls>, Partial<Controls>, PistonEngineEdge[]]>([
      [
        'the starter and running rise together',
        {},
        { starter: true, running: true, rpm: OPTIONS.idleRpm },
        ['starter-on', 'catch'],
      ],
      [
        'the catch lands with the key release',
        { starter: true },
        { starter: false, running: true, rpm: OPTIONS.idleRpm },
        ['catch'],
      ],
      [
        'the starter rises with the ignition cut',
        { rpm: OPTIONS.idleRpm, running: true },
        { starter: true, running: false, rpm: 0 },
        ['starter-on', 'ignition-cut'],
      ],
      [
        'the key release lands with the ignition cut',
        { rpm: OPTIONS.idleRpm, running: true, starter: true },
        { starter: false, running: false, rpm: 0 },
        ['ignition-cut'],
      ],
    ])('%s', (_, from, change, edges) => {
      expect(loaded(from).set(change).edges).toEqual(edges);
    });

    it('cuts the ignition under a held key, then fails the start on its release', () => {
      const c = loaded({ rpm: OPTIONS.idleRpm, running: true, starter: true });
      expect(c.set({ running: false, rpm: 0 }).edges).toEqual(['ignition-cut']);
      expect(c.set({ starter: false }).edges).toEqual(['failed-start']);
    });
  });

  describe('1: the starter rises', () => {
    it('turns a stopped engine up to the cranking rpm with the whine on', () => {
      const c = cockpit();
      const keyed = c.set({ starter: true });
      expect(keyed.edges).toEqual(['starter-on']);
      const wound = c.advance(OPTIONS.windMs);
      expect(wound.rpm).toBeCloseTo(towards(0, OPTIONS.crankingRpm));
      expect(wound.starter).toBeCloseTo(towards(0, 1));
      expect(wound.firing).toBe(0);
      expect(c.advance(SETTLE_MS).rpm).toBeCloseTo(OPTIONS.crankingRpm);
    });

    it('over a running engine adds only the whine', () => {
      const c = loaded({ rpm: OPTIONS.idleRpm, running: true });
      expect(c.set({ starter: true }).edges).toEqual(['starter-on']);
      const state = c.advance(SETTLE_MS);
      expect(state.rpm).toBe(OPTIONS.idleRpm);
      expect(state.starter).toBeCloseTo(1);
      expect(state.firing).toBe(1);
    });
  });

  describe('2: the catch', () => {
    it('fires when running rises while the starter turns, and carries rpm to the state value', () => {
      const c = cockpit();
      c.set({ starter: true });
      const cranking = c.advance(SETTLE_MS).rpm;
      const caught = c.set({ running: true, rpm: OPTIONS.idleRpm });
      expect(caught.edges).toEqual(['catch']);
      const state = c.advance(OPTIONS.catchMs);
      expect(state.rpm).toBeCloseTo(towards(cranking, OPTIONS.idleRpm));
      expect(state.firing).toBeCloseTo(towards(0, 1));
      c.set({ starter: false });
      const idling = c.advance(SETTLE_MS);
      expect(idling.rpm).toBeCloseTo(OPTIONS.idleRpm);
      expect(idling.firing).toBeCloseTo(1);
      expect(idling.starter).toBeCloseTo(0);
      expect(c.edges).toEqual(['starter-on', 'catch']);
    });

    it('fires when running rises while the engine windmills', () => {
      const c = loaded({ rpm: 220 });
      expect(windmilling(c.state())).toBe(true);
      expect(c.set({ running: true, rpm: 4800 }).edges).toEqual(['catch']);
      expect(c.advance(OPTIONS.catchMs).rpm).toBeCloseTo(towards(220, 4800));
      expect(windmilling(c.state())).toBe(false);
    });

    it('does not fire when running rises with neither the starter nor a windmill', () => {
      const c = cockpit();
      c.set({ running: true, rpm: OPTIONS.idleRpm });
      expect(c.advance(OPTIONS.throttleUpMs).rpm).toBeCloseTo(towards(0, OPTIONS.idleRpm));
      expect(c.state().firing).toBeGreaterThan(0);
      expect(c.edges).toEqual([]);
    });

    it('does not fire when running returns during a ground run-down with no starter', () => {
      const c = loaded({ rpm: OPTIONS.idleRpm, running: true });
      c.set({ running: false, rpm: 0 });
      const runningDown = c.advance(0.3 * OPTIONS.runDownMs);
      c.set({ running: true, rpm: OPTIONS.idleRpm });
      expect(c.advance(OPTIONS.throttleUpMs).rpm).toBeCloseTo(
        towards(runningDown.rpm, OPTIONS.idleRpm),
      );
      expect(c.edges).toEqual(['ignition-cut']);
    });

    it('hands a throttle move during the catch to the throttle time constant', () => {
      const c = cockpit();
      c.set({ starter: true });
      c.advance(SETTLE_MS);
      c.set({ running: true, rpm: OPTIONS.idleRpm, starter: false });
      c.advance(TICK_MS);
      const from = c.state().rpm;
      c.set({ rpm: 4000 });
      expect(c.advance(OPTIONS.throttleUpMs).rpm).toBeCloseTo(towards(from, 4000));
    });
  });

  describe('3: a failed start', () => {
    it('runs the whine and the rpm down when the key is released before the catch', () => {
      const c = cockpit();
      c.set({ starter: true });
      const cranking = c.advance(SETTLE_MS);
      expect(c.set({ starter: false }).edges).toEqual(['failed-start']);
      expect(c.advance(OPTIONS.windMs).starter).toBeCloseTo(towards(cranking.starter, 0));
      const rundown = cockpit(cranking);
      rundown.set({ starter: false });
      expect(rundown.advance(OPTIONS.runDownMs).rpm).toBeCloseTo(towards(cranking.rpm, 0));
      expect(c.edges).toEqual(['starter-on', 'failed-start']);
    });

    it('keeps cranking with the whine and no catch for as long as the key is held', () => {
      const c = cockpit();
      c.set({ starter: true });
      const held = c.advance(15_000);
      expect(held).toMatchObject({ firing: 0 });
      expect(held.starter).toBeCloseTo(1);
      expect(held.rpm).toBeCloseTo(OPTIONS.crankingRpm);
      expect(c.edges).toEqual(['starter-on']);
    });

    it('is not a failed start when the key is released after the catch', () => {
      const c = cockpit();
      c.set({ starter: true });
      c.advance(SETTLE_MS);
      c.set({ running: true, rpm: OPTIONS.idleRpm });
      c.advance(SETTLE_MS);
      c.set({ starter: false });
      expect(c.edges).toEqual(['starter-on', 'catch']);
    });
  });

  describe('4: the ignition cut', () => {
    it('drops the firing gain at once and runs down on the ground', () => {
      const c = loaded({ rpm: OPTIONS.idleRpm, running: true });
      const cut = c.set({ running: false, rpm: 0 });
      expect(cut.edges).toEqual(['ignition-cut']);
      expect(cut.firing).toBe(0);
      expect(cut.rpm).toBe(OPTIONS.idleRpm);
      expect(c.advance(OPTIONS.runDownMs).rpm).toBeCloseTo(towards(OPTIONS.idleRpm, 0));
      expect(windmilling(c.state())).toBe(false);
    });

    it('runs down to the windmill rpm in flight', () => {
      const c = loaded({ rpm: 4800, running: true });
      c.set({ running: false, rpm: 220 });
      expect(c.advance(OPTIONS.runDownMs).rpm).toBeCloseTo(towards(4800, 220));
      expect(c.edges).toEqual(['ignition-cut']);
    });
  });

  describe('5: windmilling', () => {
    it('turns without firing and follows the windmill rpm at the wind time constant', () => {
      const c = loaded({ rpm: 4800, running: true });
      c.set({ running: false, rpm: 220 });
      const quit = c.advance(SETTLE_MS);
      expect(windmilling(quit)).toBe(true);
      expect(quit.firing).toBe(0);
      expect(quit.rpm).toBeCloseTo(220);
      c.set({ rpm: 260 });
      expect(c.advance(OPTIONS.windMs).rpm).toBeCloseTo(towards(quit.rpm, 260));
      expect(c.edges).toEqual(['ignition-cut']);
    });

    it('turns at least at the cranking rpm while the starter turns a windmilling engine', () => {
      const c = loaded({ rpm: 220 });
      c.set({ starter: true });
      expect(c.advance(SETTLE_MS).rpm).toBeCloseTo(OPTIONS.crankingRpm);
    });
  });

  describe('6: a jump', () => {
    it('loads parking to cruise and back with every input at its target and no edge', () => {
      const c = cockpit();
      const cruise = c.set({ rpm: 4800, running: true }, ALL);
      expect(cruise).toMatchObject({ rpm: 4800, firing: 1, starter: 0, edges: [] });
      const parking = c.set(PARKED, ALL);
      expect(parking).toMatchObject({ rpm: 0, firing: 0, starter: 0, edges: [] });
      expect(c.edges).toEqual([]);
    });

    it('fires no catch for a jumped running, from a windmill or under the starter', () => {
      const windmill = loaded({ rpm: 220 });
      expect(windmill.set({ running: true, rpm: 4800 }, ALL)).toMatchObject({
        rpm: 4800,
        firing: 1,
        catching: false,
        edges: [],
      });
      const c = cockpit();
      c.set({ starter: true });
      const cranking = c.advance(SETTLE_MS);
      const caught = c.set({ running: true, rpm: OPTIONS.idleRpm }, ['running']);
      expect(caught).toMatchObject({ firing: 1, catching: false, edges: [] });
      expect(caught.rpm).toBeCloseTo(cranking.rpm);
      expect(c.advance(OPTIONS.throttleUpMs).rpm).toBeCloseTo(
        towards(cranking.rpm, OPTIONS.idleRpm),
      );
      expect(c.edges).toEqual(['starter-on']);
    });

    it('fires no ignition cut for a jumped running and keeps the rpm smoothing', () => {
      const c = loaded({ rpm: OPTIONS.idleRpm, running: true });
      const cut = c.set({ running: false, rpm: 0 }, ['running']);
      expect(cut).toMatchObject({ rpm: OPTIONS.idleRpm, firing: 0, catching: false, edges: [] });
      expect(c.advance(OPTIONS.runDownMs).rpm).toBeCloseTo(towards(OPTIONS.idleRpm, 0));
      expect(c.edges).toEqual([]);
    });

    it('fires no starter edge for a jumped starter', () => {
      const c = cockpit();
      expect(c.set({ starter: true }, ['starter'])).toMatchObject({ starter: 1, edges: [] });
      expect(c.set({ starter: false }, ['starter'])).toMatchObject({ starter: 0, edges: [] });
    });

    it('jumps only the listed input on a carried phase change', () => {
      const c = loaded({ rpm: 220 });
      const caught = c.set({ running: true, rpm: 4800 }, ['rpm']);
      expect(caught).toMatchObject({ rpm: 4800, edges: ['catch'] });
      expect(caught.firing).toBe(0);
      const climb = c.set({ rpm: 5000 }, ['rpm']);
      expect(climb.rpm).toBe(5000);
    });
  });
});
