import { existsSync, globSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(import.meta.dirname, '..');
const imageFile = /\.(?:svg|png|jpe?g|webp|gif|avif|ico|bmp|tiff?)$/i;
const embeddedRaster = /data:image\/(?:png|jpe?g|webp|gif|avif)|<image[\s>/]/i;
const licenceRow = /^\|\s*`([^`]+)`/;

const packageDirs = globSync('packages/*/', { cwd: repoRoot })
  .map((dir) => dir.replace(/[\\/]$/, ''))
  .sort();

const imagesOf = (dir: string): string[] =>
  globSync('src/**/*', { cwd: resolve(repoRoot, dir) })
    .map((file) => file.replaceAll('\\', '/'))
    .filter((file) => imageFile.test(file))
    .sort();

const rowsOf = (dir: string): string[] => {
  const register = resolve(repoRoot, dir, 'LICENSES.md');
  if (!existsSync(register)) return [];
  return readFileSync(register, 'utf8')
    .split('\n')
    .flatMap((line) => licenceRow.exec(line)?.[1] ?? []);
};

describe('image licence register', () => {
  it('finds the packages and their images', () => {
    expect(packageDirs.length).toBeGreaterThan(0);
    expect(packageDirs.flatMap(imagesOf).length).toBeGreaterThan(0);
  });

  describe.each(packageDirs)('%s', (dir) => {
    const images = imagesOf(dir);
    const rows = rowsOf(dir);

    it('has a licence row for every image under src/', () => {
      expect(images.filter((image) => !rows.includes(image))).toEqual([]);
    });

    it('names only files that exist', () => {
      expect(rows.filter((row) => !existsSync(resolve(repoRoot, dir, row)))).toEqual([]);
    });

    it('lists no file twice', () => {
      expect(rows.filter((row, at) => rows.indexOf(row) !== at)).toEqual([]);
    });

    it('embeds no raster image in an SVG', () => {
      const embedding = images
        .filter((image) => image.toLowerCase().endsWith('.svg'))
        .filter((image) =>
          embeddedRaster.test(readFileSync(resolve(repoRoot, dir, image), 'utf8')),
        );
      expect(embedding).toEqual([]);
    });
  });
});
