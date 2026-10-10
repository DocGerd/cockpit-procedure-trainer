import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { latestReleases } from './changelog';

const sample = `# Changelog

## [Unreleased]

- Pending.

## [0.3.0] - 2026-10-09

### Added

- A \`code\` word and a [link](https://example.com).
- An item that wraps
  onto a second line.

### Fixed

- A fix.

## [0.2.0] - 2026-10-08

### Changed

- Older.

## [0.1.0] - 2026-10-01

### Added

- Oldest.

[0.3.0]: https://example.com/compare
`;

describe('latestReleases', () => {
  it('reads the newest releases with their sections, skipping Unreleased', () => {
    expect(latestReleases(sample, 2)).toEqual([
      {
        version: '0.3.0',
        date: '2026-10-09',
        sections: [
          {
            heading: 'Added',
            items: ['A code word and a link.', 'An item that wraps onto a second line.'],
          },
          { heading: 'Fixed', items: ['A fix.'] },
        ],
      },
      {
        version: '0.2.0',
        date: '2026-10-08',
        sections: [{ heading: 'Changed', items: ['Older.'] }],
      },
    ]);
  });

  it('stops at the end of the file', () => {
    expect(latestReleases(sample, 5).map((release) => release.version)).toEqual([
      '0.3.0',
      '0.2.0',
      '0.1.0',
    ]);
  });

  it('reads the repository changelog, newest release first', () => {
    const changelog = readFileSync(
      resolve(import.meta.dirname, '../../../../CHANGELOG.md'),
      'utf8',
    );
    const [newest] = latestReleases(changelog, 1);
    expect(newest?.version).toBe(/^## \[(\d+\.\d+\.\d+)\]/m.exec(changelog)?.[1]);
    expect(newest?.sections.flatMap((section) => section.items).length).toBeGreaterThan(0);
  });
});
