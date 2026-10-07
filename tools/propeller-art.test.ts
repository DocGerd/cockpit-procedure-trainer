import { globSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(import.meta.dirname, '..');
const withPropeller = globSync('packages/aircraft-*', { cwd: repoRoot })
  .filter((dir) =>
    readFileSync(resolve(repoRoot, dir, 'src/index.ts'), 'utf8').includes('engineRunning'),
  )
  .sort();

const phaseImages = (dir: string) =>
  globSync('src/assets/phase-*.svg', { cwd: resolve(repoRoot, dir) }).sort();
const isRunning = (file: string) => file.endsWith('-running.svg');

describe('propeller artwork', () => {
  it('finds the aircraft that declare engineRunning', () => {
    expect(withPropeller.length).toBeGreaterThan(0);
  });

  describe.each(withPropeller)('%s', (dir) => {
    const files = phaseImages(dir);
    const read = (file: string) => readFileSync(resolve(repoRoot, dir, file), 'utf8');

    it('has phase images', () => {
      expect(files.filter((file) => !isRunning(file)).length).toBeGreaterThan(0);
    });

    it.each(files.filter((file) => !isRunning(file)))(
      '%s draws the blade and has a running twin',
      (file) => {
        expect(read(file)).toContain('id="propeller-blade"');
        expect(read(file)).not.toContain('id="propeller-disc"');
        expect(files).toContain(file.replace(/\.svg$/, '-running.svg'));
      },
    );

    it.each(files.filter(isRunning))('%s draws the disc and not the blade', (file) => {
      expect(basename(file)).toMatch(/^phase-.+-running\.svg$/);
      expect(read(file)).toContain('id="propeller-disc"');
      expect(read(file)).not.toContain('id="propeller-blade"');
    });
  });
});
