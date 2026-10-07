import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readmeProblems } from './readme-contract';
import type { ReadmeDevice } from './readme-contract';

const packagesDir = resolve(import.meta.dirname, '../packages');
const deviceDirs = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith('device-'))
  .map((entry) => entry.name)
  .sort();

const isDevice = (value: unknown): value is ReadmeDevice =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  'notModelled' in value &&
  'controls' in value;

describe('device READMEs', () => {
  it('finds the device packages', () => {
    expect(deviceDirs.length).toBeGreaterThan(0);
  });

  describe.each(deviceDirs)('%s', (dir) => {
    it('meets the README contract in docs/adding-a-device.md', async () => {
      const logic: Record<string, unknown> = await import(
        resolve(packagesDir, dir, 'src/logic/index.ts')
      );
      const devices = Object.values(logic).filter(isDevice);
      expect(devices.map((device) => device.id)).toEqual([dir.replace(/^device-/, '')]);
      const readme = readFileSync(resolve(packagesDir, dir, 'README.md'), 'utf8');
      expect(readmeProblems(readme, devices[0] as ReadmeDevice)).toEqual([]);
    });
  });
});
