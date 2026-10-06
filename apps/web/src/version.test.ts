import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { copyrightNotice, latestRelease, versionLabel } from './version';

const repoFile = (name: string) =>
  readFileSync(resolve(import.meta.dirname, '../../..', name), 'utf8');

describe('latestRelease', () => {
  it('takes the newest released heading and skips Unreleased', () => {
    const changelog =
      '# Changelog\n\n## [Unreleased]\n\n## [0.7.0] - 2026-10-06\n\n## [0.6.0] - 2026-10-05\n';
    expect(latestRelease(changelog)).toBe('0.7.0');
  });

  it('is undefined when nothing is released', () => {
    expect(latestRelease('## [Unreleased]\n')).toBeUndefined();
  });

  it('reads the repository changelog, the same source the release workflow tags from', () => {
    expect(latestRelease(repoFile('CHANGELOG.md'))).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('copyrightNotice', () => {
  it('reads holder and year from the licence', () => {
    expect(copyrightNotice('MIT License\n\nCopyright (c) 2031 Jane Doe\n\nPermission')).toBe(
      '© 2031 Jane Doe',
    );
  });

  it('is undefined without a copyright line', () => {
    expect(copyrightNotice('MIT License')).toBeUndefined();
  });

  it('matches the repository LICENSE', () => {
    expect(copyrightNotice(repoFile('LICENSE'))).toBe('© 2026 Patrick Kuhn');
  });
});

describe('versionLabel', () => {
  it('is the released semver in production, whatever commit was built', () => {
    expect(versionLabel({ release: '0.7.0', deployEnv: 'prod', commit: 'abcdef0123' })).toBe(
      'v0.7.0',
    );
  });

  it('adds the short commit on UAT', () => {
    expect(versionLabel({ release: '0.7.0', deployEnv: 'uat', commit: 'abcdef0123456789' })).toBe(
      'v0.7.0 · abcdef0',
    );
  });

  it('shows the version alone on UAT when the commit is unknown', () => {
    expect(versionLabel({ release: '0.7.0', deployEnv: 'uat', commit: undefined })).toBe('v0.7.0');
    expect(versionLabel({ release: '0.7.0', deployEnv: 'uat', commit: '' })).toBe('v0.7.0');
  });

  it('marks a build without a release version', () => {
    expect(versionLabel({ release: undefined, deployEnv: 'prod', commit: undefined })).toBe('dev');
  });
});
