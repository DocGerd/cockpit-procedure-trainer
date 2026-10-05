import type { JsonObject, JsonValue } from '@cpt/core';

export const ARC_COLOURS = ['green', 'yellow', 'red', 'white'] as const;
export type ArcColour = (typeof ARC_COLOURS)[number];

export const LAMP_COLOURS = ['amber', 'red', 'green', 'blue', 'white'] as const;
export type LampColour = (typeof LAMP_COLOURS)[number];

export type GaugeArc = { readonly from: number; readonly to: number; readonly colour: ArcColour };

export type GaugeConfig = {
  readonly min: number;
  readonly max: number;
  readonly units: string;
  readonly ticks: readonly number[];
  readonly arcs: readonly GaugeArc[];
};

export type ReadoutConfig = { readonly units: string; readonly decimals: number | null };

const DEFAULT_MIN = 0;
const DEFAULT_MAX = 100;
const DEFAULT_TICK_INTERVALS = 5;
const MAX_TICKS = 40;
const MAX_DECIMALS = 6;

const isNumber = (value: JsonValue | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isObject = (value: JsonValue | undefined): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isOneOf = <T extends string>(set: readonly T[], value: JsonValue | undefined): value is T =>
  typeof value === 'string' && (set as readonly string[]).includes(value);

function evenTicks(intervals: number, min: number, max: number): number[] {
  return Array.from({ length: intervals + 1 }, (_, i) => min + ((max - min) * i) / intervals);
}

function readTicks(raw: JsonValue | undefined, min: number, max: number): number[] | null {
  if (raw === undefined) return evenTicks(DEFAULT_TICK_INTERVALS, min, max);
  if (typeof raw === 'number') {
    return Number.isInteger(raw) && raw >= 1 && raw <= MAX_TICKS ? evenTicks(raw, min, max) : null;
  }
  if (!Array.isArray(raw) || raw.length > MAX_TICKS) return null;
  const ticks: number[] = [];
  for (const tick of raw) {
    if (!isNumber(tick) || tick < min || tick > max) return null;
    ticks.push(tick);
  }
  return ticks;
}

function readArcs(raw: JsonValue | undefined, min: number, max: number): GaugeArc[] | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) return null;
  const arcs: GaugeArc[] = [];
  for (const arc of raw) {
    if (!isObject(arc)) return null;
    const { from, to, colour } = arc;
    if (!isNumber(from) || !isNumber(to) || from >= to || !isOneOf(ARC_COLOURS, colour)) {
      return null;
    }
    arcs.push({ from: Math.max(min, from), to: Math.min(max, to), colour });
  }
  return arcs.filter((arc) => arc.from < arc.to);
}

export function readGaugeOptions(options: JsonObject | undefined): GaugeConfig | null {
  const raw = options ?? {};
  const min = raw.min ?? DEFAULT_MIN;
  const max = raw.max ?? DEFAULT_MAX;
  if (!isNumber(min) || !isNumber(max) || min >= max) return null;
  const units = raw.units ?? '';
  if (typeof units !== 'string') return null;
  const ticks = readTicks(raw.ticks, min, max);
  const arcs = readArcs(raw.arcs, min, max);
  if (ticks === null || arcs === null) return null;
  return { min, max, units, ticks, arcs };
}

export function readLamp(options: JsonObject | undefined): LampColour | null {
  const lamp = options?.lamp ?? 'amber';
  return isOneOf(LAMP_COLOURS, lamp) ? lamp : null;
}

export function readReadoutOptions(options: JsonObject | undefined): ReadoutConfig | null {
  const raw = options ?? {};
  const units = raw.units ?? '';
  if (typeof units !== 'string') return null;
  const decimals = raw.decimals ?? null;
  if (decimals !== null) {
    if (!isNumber(decimals) || !Number.isInteger(decimals)) return null;
    if (decimals < 0 || decimals > MAX_DECIMALS) return null;
  }
  return { units, decimals };
}
