import type { JsonObject, JsonValue } from '@cpt/core';

export type PistonEngineOptions = {
  readonly cylinders: number;
  readonly idleRpm: number;
  readonly maxContinuousRpm: number;
  readonly crankingRpm: number;
  readonly throttleUpMs: number;
  readonly throttleDownMs: number;
  readonly catchMs: number;
  readonly runDownMs: number;
  /** The engine turned without combustion: starter wind-up and whine, a windmill speeding up. */
  readonly windMs: number;
  /** Engine rpm over propeller rpm. An aircraft fact; the blade-pass tone needs it and the blade count. */
  readonly gearboxRatio?: number;
  /** An aircraft fact; the blade-pass tone needs it and the gearbox ratio. */
  readonly bladeCount?: number;
};

const REQUIRED_OPTIONS = ['cylinders', 'idleRpm', 'maxContinuousRpm'] as const;
type RequiredOption = (typeof REQUIRED_OPTIONS)[number];
const FACT_OPTIONS = ['gearboxRatio', 'bladeCount'] as const;
type FactOption = (typeof FACT_OPTIONS)[number];

/** Voice defaults tuned by ear, not aircraft facts. */
export const pistonEngineDefaults: Omit<PistonEngineOptions, RequiredOption | FactOption> = {
  crankingRpm: 300,
  throttleUpMs: 500,
  throttleDownMs: 800,
  catchMs: 150,
  runDownMs: 1500,
  windMs: 600,
};

export type PistonEngineInputName = 'rpm' | 'running' | 'starter';

export type PistonEngineModelInput = {
  readonly rpm: number;
  readonly running: boolean;
  readonly starter: boolean;
  /** Inputs that take their target at once and fire no edge in this frame. */
  readonly jump: readonly PistonEngineInputName[];
};

export type PistonEngineEdge = 'starter-on' | 'catch' | 'failed-start' | 'ignition-cut';

export type PistonEngineModelState = {
  readonly rpm: number;
  readonly firing: number;
  readonly starter: number;
  /** Rpm follows the catch time constant until the state rpm next changes. */
  readonly catching: boolean;
  readonly input: Omit<PistonEngineModelInput, 'jump'>;
  /** Edges fired by the step that produced this state. */
  readonly edges: readonly PistonEngineEdge[];
};

const SECONDS_PER_MINUTE = 60;
const REVOLUTIONS_PER_CYCLE = 2;

export const cycleHz = (rpm: number) => rpm / SECONDS_PER_MINUTE / REVOLUTIONS_PER_CYCLE;

export const firingHz = (rpm: number, cylinders: number) => cycleHz(rpm) * cylinders;

export const bladePassHz = (rpm: number, gearboxRatio: number, bladeCount: number) =>
  (rpm / gearboxRatio / SECONDS_PER_MINUTE) * bladeCount;

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

export const power = (rpm: number, { idleRpm, maxContinuousRpm }: PistonEngineOptions) =>
  clamp((rpm - idleRpm) / (maxContinuousRpm - idleRpm), 0, 1);

export const windmilling = ({ input }: PistonEngineModelState) => !input.running && input.rpm > 0;

const approach = (value: number, target: number, dtMs: number, timeConstantMs: number) =>
  target + (value - target) * Math.exp(-dtMs / timeConstantMs);

const isNumber = (value: JsonValue | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const pistonEngineProblems = (options: JsonObject): readonly string[] => {
  const known = new Set<string>([
    ...REQUIRED_OPTIONS,
    ...FACT_OPTIONS,
    ...Object.keys(pistonEngineDefaults),
  ]);
  const problems = Object.keys(options)
    .filter((key) => !known.has(key))
    .map((key) => `unknown option ${key}`);
  for (const key of REQUIRED_OPTIONS) {
    if (!Object.hasOwn(options, key)) problems.push(`missing option ${key}`);
  }
  const { idleRpm } = options;
  const idle = isNumber(idleRpm) && idleRpm > 0 ? idleRpm : undefined;
  const inRange: Record<keyof PistonEngineOptions, (value: JsonValue | undefined) => boolean> = {
    cylinders: (value) => isNumber(value) && Number.isInteger(value) && value > 0,
    idleRpm: () => idle !== undefined,
    maxContinuousRpm: (value) =>
      isNumber(value) && value > 0 && (idle === undefined || value > idle),
    crankingRpm: (value) => isNumber(value) && value > 0 && (idle === undefined || value < idle),
    throttleUpMs: (value) => isNumber(value) && value > 0,
    throttleDownMs: (value) => isNumber(value) && value > 0,
    catchMs: (value) => isNumber(value) && value > 0,
    runDownMs: (value) => isNumber(value) && value > 0,
    windMs: (value) => isNumber(value) && value > 0,
    gearboxRatio: (value) => isNumber(value) && value > 0,
    bladeCount: (value) => isNumber(value) && Number.isInteger(value) && value > 0,
  };
  const resolved: JsonObject = { ...pistonEngineDefaults, ...options };
  for (const [key, check] of Object.entries(inRange)) {
    if (!Object.hasOwn(resolved, key) || check(resolved[key])) continue;
    problems.push(
      Object.hasOwn(options, key)
        ? `option ${key} is out of range`
        : `default ${key} ${JSON.stringify(resolved[key])} is out of range`,
    );
  }
  return problems;
};

export const pistonEngineOptions = (options: JsonObject): PistonEngineOptions => {
  const problems = pistonEngineProblems(options);
  if (problems.length > 0) throw new Error(`piston-engine: ${problems.join('; ')}`);
  return { ...pistonEngineDefaults, ...options } as PistonEngineOptions;
};

export const pistonEngineModel = (options: PistonEngineOptions) => {
  const { crankingRpm, throttleUpMs, throttleDownMs, catchMs, runDownMs, windMs } = options;

  const initial: PistonEngineModelState = {
    rpm: 0,
    firing: 0,
    starter: 0,
    catching: false,
    input: { rpm: 0, running: false, starter: false },
    edges: [],
  };

  const step = (
    previous: PistonEngineModelState,
    { jump, ...input }: PistonEngineModelInput,
    elapsedMs: number,
  ): PistonEngineModelState => {
    // NaN or a clock stepping back would poison every later step.
    const dtMs = elapsedMs > 0 ? elapsedMs : 0;
    const was = previous.input;
    const jumps = (name: PistonEngineInputName) => jump.includes(name);
    const edges: PistonEngineEdge[] = [];
    if (!jumps('starter')) {
      if (input.starter && !was.starter) edges.push('starter-on');
      if (!input.starter && was.starter && !input.running && !was.running) {
        edges.push('failed-start');
      }
    }
    if (!jumps('running')) {
      // A windmill is a state rpm above 0 (in flight); a smoothed run-down never reaches 0.
      const turning = input.starter || was.starter || was.rpm > 0;
      if (input.running && !was.running && turning) edges.push('catch');
      if (!input.running && was.running) edges.push('ignition-cut');
    }
    const catching =
      edges.includes('catch') || (previous.catching && input.running && input.rpm === was.rpm);

    const rpmTarget =
      input.starter && !input.running ? Math.max(input.rpm, crankingRpm) : input.rpm;
    const rising = rpmTarget > previous.rpm;
    const rpmTimeConstantMs = input.running
      ? catching
        ? catchMs
        : rising
          ? throttleUpMs
          : throttleDownMs
      : rising
        ? windMs
        : runDownMs;
    const rpm = jumps('rpm')
      ? rpmTarget
      : approach(previous.rpm, rpmTarget, dtMs, rpmTimeConstantMs);

    const firing = !input.running
      ? 0
      : jumps('running')
        ? 1
        : approach(previous.firing, 1, dtMs, catchMs);

    const starterTarget = input.starter ? 1 : 0;
    const starter = jumps('starter')
      ? starterTarget
      : approach(previous.starter, starterTarget, dtMs, windMs);

    return { rpm, firing, starter, catching, input, edges };
  };

  return { initial, step };
};
