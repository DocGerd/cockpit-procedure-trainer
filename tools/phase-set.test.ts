import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const packagesDir = resolve(import.meta.dirname, '../packages');
const aircraftDirs = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith('aircraft-'))
  .map((entry) => entry.name)
  .sort();

type Phased = { readonly id: string; readonly phases: Readonly<Record<string, unknown>> };

const isAircraft = (value: unknown): value is Phased =>
  typeof value === 'object' &&
  value !== null &&
  'contractVersion' in value &&
  'phases' in value &&
  typeof value.phases === 'object';

const core = (await import(resolve(packagesDir, 'core/src/index.ts'))) as {
  readonly phaseOrder: readonly string[];
};

/** The shared phases the aircraft leaves out and the phases it adds, each prefixed. */
const phaseSetGaps = ({ phases }: Phased): string[] => [
  ...core.phaseOrder.filter((id) => !Object.hasOwn(phases, id)).map((id) => `missing ${id}`),
  ...Object.keys(phases)
    .filter((id) => !core.phaseOrder.includes(id))
    .map((id) => `unknown ${id}`),
];

async function load(dir: string): Promise<Phased[]> {
  const exports: Record<string, unknown> = await import(resolve(packagesDir, dir, 'src/index.ts'));
  return Object.values(exports).filter(isAircraft);
}

describe('the shared phase set', () => {
  it('finds the aircraft packages', () => {
    expect(aircraftDirs.length).toBeGreaterThan(0);
  });

  describe.each(aircraftDirs)('%s', (dir) => {
    it('exports an aircraft that declares exactly the shared phases', async () => {
      const aircraft = await load(dir);
      expect(aircraft.length).toBeGreaterThan(0);
      for (const entry of aircraft) expect(phaseSetGaps(entry), entry.id).toEqual([]);
    });

    it('would be caught without one of its phases or with an extra one', async () => {
      const [entry] = await load(dir);
      if (!entry) throw new Error(`${dir} exports no aircraft`);
      const rest = Object.fromEntries(
        Object.entries(entry.phases).filter(([id]) => id !== 'taxiOut'),
      );
      expect(phaseSetGaps({ ...entry, phases: rest })).toEqual(['missing taxiOut']);
      expect(phaseSetGaps({ ...entry, phases: { ...entry.phases, runup: {} } })).toEqual([
        'unknown runup',
      ]);
    });
  });
});
