import { STEP_MS } from '@cpt/core';
import type { AudioOut } from '../audio-engine';
import type { Voice, VoiceFactory, VoiceFrame } from '../voice-factories';
import { NOISE_RMS, noiseSource } from './noise';
import {
  bladePassHz,
  cycleHz,
  firingHz,
  pistonEngineModel,
  pistonEngineOptions,
  pistonEngineProblems,
  power,
} from './piston-engine-model';
import type {
  PistonEngineInputName,
  PistonEngineModelState,
  PistonEngineOptions,
} from './piston-engine-model';

export const SMOOTHING_S = STEP_MS / 3 / 1000;

const INPUTS: readonly string[] = ['rpm', 'running', 'starter'] satisfies PistonEngineInputName[];

// The model only approaches its targets; a change too small to hear is not scheduled. Relative to
// the value, as pitch and loudness are heard, so frequencies in Hz settle as soon as gains do;
// absolute near 0.
const AUTOMATION_DEADBAND = 1e-4;
const RELATIVE_DEADBAND = 1e-3;

// Voice defaults tuned by ear, not aircraft facts.
const IDLE_LEVEL_DB = -12;
const FIRING_LEVEL = 0.8;
const FIRING_WAVE_ORDERS = 48;
const FIRING_WAVE_ROLLOFF = 0.8;
const UNEVEN_BEAT_SHARE = 0.15;
const FIRING_CUTOFF_ORDERS = 6;
const FIRING_CUTOFF_OPENING_AT_POWER = 1.5;
const MIN_FILTER_HZ = 20;
const EXHAUST_LEVEL = 0.35;
const NO_COMBUSTION_LEVEL = 0.5;
const EXHAUST_BAND_ORDERS = 8;
const EXHAUST_Q = 0.9;
const EXHAUST_DEPTH_AT_IDLE = 0.9;
const EXHAUST_DEPTH_AT_POWER = 0.35;
const NO_COMBUSTION_DEPTH = 1;
const PULSE_WAVE_ORDERS = 4;
const PULSE_WAVE_ROLLOFF = 1.5;
const JITTER_RMS_SHARE = 0.006;
const JITTER_CUTOFF_HZ = 6;
const WHINE_HZ = 380;
const WHINE_FIRST_TURN_SHARE = 0.4;
const WHINE_HARMONICS = 6;
const WHINE_LEVEL = 0.04;
const BLADE_PASS_LEVEL = 0.3;
const BLADE_PASS_HARMONICS = 4;
const COMPRESSION_DEPTH = 0.8;
const FADE_TIME_CONSTANT_S = 0.03;
const TIME_CONSTANTS_TO_SILENCE = 10;

const decibels = (db: number) => 10 ** (db / 20);

const inaudible = (next: number, issued: number) =>
  Math.abs(next - issued) <= Math.max(AUTOMATION_DEADBAND, RELATIVE_DEADBAND * Math.abs(issued));

const reading = (inputs: Readonly<Record<string, number>>, name: PistonEngineInputName) => {
  const value = inputs[name];
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : 0;
};

/**
 * Cosine terms on the multiples of the fundamental: full share on every firing order, a small
 * share on the orders between them for the uneven beat of the firing sequence.
 */
const pulseWave = (
  context: BaseAudioContext,
  cylinders: number,
  orders: number,
  rolloff: number,
) => {
  const real = [0];
  for (let order = 1; order <= cylinders * orders; order += 1) {
    const envelope = Math.min(1, (cylinders / order) ** rolloff);
    real.push(order % cylinders === 0 ? envelope : envelope * UNEVEN_BEAT_SHARE);
  }
  return context.createPeriodicWave(
    real,
    real.map(() => 0),
  );
};

const sineWave = (context: BaseAudioContext, harmonics: number) => {
  const imag = [0];
  for (let harmonic = 1; harmonic <= harmonics; harmonic += 1) imag.push(1 / harmonic);
  return context.createPeriodicWave(
    imag.map(() => 0),
    imag,
  );
};

const targetsFor = (
  { rpm, firing, starter }: PistonEngineModelState,
  options: PistonEngineOptions,
  jitterPerCycleHz: number,
) => {
  const share = power(rpm, options);
  const cycle = cycleHz(rpm);
  const firingOrder = firingHz(rpm, options.cylinders);
  const level = decibels(IDLE_LEVEL_DB * (1 - share)) * Math.min(1, rpm / options.idleRpm);
  const noise = level * (firing * EXHAUST_LEVEL + (1 - firing) * NO_COMBUSTION_LEVEL);
  const depth =
    firing * (EXHAUST_DEPTH_AT_IDLE + (EXHAUST_DEPTH_AT_POWER - EXHAUST_DEPTH_AT_IDLE) * share) +
    (1 - firing) * NO_COMBUSTION_DEPTH;
  const whine = starter * WHINE_LEVEL;
  return {
    bus: cycle,
    jitter: cycle * jitterPerCycleHz,
    firingCutoff: Math.max(
      MIN_FILTER_HZ,
      firingOrder * FIRING_CUTOFF_ORDERS * (1 + FIRING_CUTOFF_OPENING_AT_POWER * share),
    ),
    firing: level * firing * FIRING_LEVEL,
    exhaustCentre: Math.max(MIN_FILTER_HZ, firingOrder * EXHAUST_BAND_ORDERS),
    exhaust: noise,
    exhaustDepth: noise * depth,
    whineHz: WHINE_HZ * (WHINE_FIRST_TURN_SHARE + (1 - WHINE_FIRST_TURN_SHARE) * starter),
    whine,
    compression: whine * COMPRESSION_DEPTH * (1 - firing),
    bladePass: level * BLADE_PASS_LEVEL,
  };
};

type Targets = ReturnType<typeof targetsFor>;

function buildPistonEngine(
  { context, input }: AudioOut,
  options: PistonEngineOptions,
  nodes: AudioNode[],
  disconnect: () => void,
): Voice {
  const model = pistonEngineModel(options);
  const node = <T extends AudioNode>(created: T) => {
    nodes.push(created);
    return created;
  };

  const output = node(context.createGain());
  output.connect(input);

  const bus = node(context.createConstantSource());
  const noise = node(noiseSource(context));

  // White noise keeps the share of its power that lies below the low-pass cutoff.
  const jitterRms = NOISE_RMS * Math.sqrt((2 * JITTER_CUTOFF_HZ) / context.sampleRate);
  const jitterFilter = node(context.createBiquadFilter());
  jitterFilter.type = 'lowpass';
  jitterFilter.frequency.value = JITTER_CUTOFF_HZ;
  const jitter = node(context.createGain());
  noise.connect(jitterFilter).connect(jitter).connect(bus.offset);

  const firing = node(context.createOscillator());
  firing.setPeriodicWave(
    pulseWave(context, options.cylinders, FIRING_WAVE_ORDERS, FIRING_WAVE_ROLLOFF),
  );
  const firingFilter = node(context.createBiquadFilter());
  firingFilter.type = 'lowpass';
  const firingGain = node(context.createGain());
  firing.connect(firingFilter).connect(firingGain).connect(output);

  const modulator = node(context.createOscillator());
  modulator.setPeriodicWave(
    pulseWave(context, options.cylinders, PULSE_WAVE_ORDERS, PULSE_WAVE_ROLLOFF),
  );
  const exhaustFilter = node(context.createBiquadFilter());
  exhaustFilter.type = 'bandpass';
  exhaustFilter.Q.value = EXHAUST_Q;
  const exhaustGain = node(context.createGain());
  const exhaustDepth = node(context.createGain());
  noise.connect(exhaustFilter).connect(exhaustGain).connect(output);
  modulator.connect(exhaustDepth).connect(exhaustGain.gain);

  for (const oscillator of [firing, modulator]) {
    oscillator.frequency.value = 0;
    bus.connect(oscillator.frequency);
  }

  const whine = node(context.createOscillator());
  whine.setPeriodicWave(sineWave(context, WHINE_HARMONICS));
  const whineGain = node(context.createGain());
  const compression = node(context.createGain());
  whine.connect(whineGain).connect(output);
  modulator.connect(compression).connect(whineGain.gain);

  const sources: AudioScheduledSourceNode[] = [bus, noise, firing, modulator, whine];

  const params: Partial<Record<keyof Targets, AudioParam>> = {
    bus: bus.offset,
    jitter: jitter.gain,
    firingCutoff: firingFilter.frequency,
    firing: firingGain.gain,
    exhaustCentre: exhaustFilter.frequency,
    exhaust: exhaustGain.gain,
    exhaustDepth: exhaustDepth.gain,
    whineHz: whine.frequency,
    whine: whineGain.gain,
    compression: compression.gain,
  };

  // Built only when the aircraft gives both facts, so any other voice keeps its wave-1 graph.
  const { gearboxRatio, bladeCount } = options;
  if (gearboxRatio !== undefined && bladeCount !== undefined) {
    const tone = node(context.createOscillator());
    tone.setPeriodicWave(sineWave(context, BLADE_PASS_HARMONICS));
    tone.frequency.value = 0;
    const scale = node(context.createGain());
    scale.gain.value = bladePassHz(1, gearboxRatio, bladeCount) / cycleHz(1);
    const level = node(context.createGain());
    bus.connect(scale).connect(tone.frequency);
    tone.connect(level).connect(output);
    sources.push(tone);
    params.bladePass = level.gain;
  }
  const bound = Object.entries(params) as [keyof Targets, AudioParam][];
  const jitterPerCycleHz = JITTER_RMS_SHARE / jitterRms;
  const targets = (state: PistonEngineModelState) => targetsFor(state, options, jitterPerCycleHz);

  let state = model.initial;
  const issued: Targets = targets(state);
  for (const [name, param] of bound) param.value = issued[name];

  for (const source of sources) source.start();

  let lastMs: number | undefined;
  let stopped = false;

  return {
    update(inputs, { nowMs, live, jump }: VoiceFrame) {
      if (stopped) return;
      state = model.step(
        state,
        {
          rpm: reading(inputs, 'rpm'),
          running: reading(inputs, 'running') > 0,
          starter: reading(inputs, 'starter') > 0,
          jump: jump.filter((name): name is PistonEngineInputName => INPUTS.includes(name)),
        },
        lastMs === undefined ? 0 : nowMs - lastMs,
      );
      lastMs = nowMs;
      if (!live) return;
      const next = targets(state);
      for (const [name, param] of bound) {
        if (inaudible(next[name], issued[name])) continue;
        param.setTargetAtTime(next[name], context.currentTime, SMOOTHING_S);
        issued[name] = next[name];
      }
    },
    stop() {
      if (stopped) return;
      stopped = true;
      const now = context.currentTime;
      output.gain.cancelScheduledValues(now);
      output.gain.setTargetAtTime(0, now, FADE_TIME_CONSTANT_S);
      // A context that is not running plays nothing to fade, and fires no `ended` until it runs.
      const running = context.state === 'running';
      const end = running ? now + FADE_TIME_CONSTANT_S * TIME_CONSTANTS_TO_SILENCE : now;
      if (running) bus.addEventListener('ended', disconnect, { once: true });
      for (const source of sources) source.stop(end);
      if (!running) disconnect();
    },
  };
}

function createPistonEngine(out: AudioOut, options: PistonEngineOptions): Voice {
  const nodes: AudioNode[] = [];
  const disconnect = () => {
    for (const each of nodes) each.disconnect();
  };
  try {
    return buildPistonEngine(out, options, nodes, disconnect);
  } catch (error) {
    // A failed create hands the driver no voice, so nothing else could stop this partial graph.
    disconnect();
    throw error;
  }
}

export const pistonEngine: VoiceFactory = {
  create: (out, options) => createPistonEngine(out, pistonEngineOptions(options)),
  problems: pistonEngineProblems,
};
