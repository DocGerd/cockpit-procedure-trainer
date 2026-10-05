import { expect, it } from 'vitest';
import { electricalBus, pistonEngineStart } from './index';

it('composes the bus and the engine through the blocks alone', () => {
  let bus = electricalBus.initial;
  let engine = pistonEngineStart.initial;
  const tick = (starterEngaged: boolean, masterOn: boolean) => {
    engine = pistonEngineStart.step(
      engine,
      { starterEngaged, magnetos: 'both', busPowered: bus.busPowered, engineFailed: false },
      100,
    );
    bus = electricalBus.step(
      bus,
      { masterOn, alternatorOn: true, engineRunning: engine.running, alternatorFailed: false },
      100,
    );
  };

  tick(true, false);
  tick(true, false);
  expect(engine.running).toBe(false);

  for (let i = 0; i < 30 && !engine.running; i += 1) tick(true, true);
  expect(engine.running).toBe(true);

  tick(false, true);
  expect(engine.running).toBe(true);
  expect(bus.charging).toBe(true);
});
