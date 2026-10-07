import { describe, expect, it } from 'vitest';
import { readmeProblems } from './readme-contract';
import type { ReadmeDevice } from './readme-contract';

const device: ReadmeDevice = {
  id: 'demo',
  notModelled: [{ en: 'Audio' }, { en: 'Memory' }],
  controls: { volume: {}, key0: {}, key1: {}, key2: {} },
};

const good = [
  '# @cpt/device-demo',
  '',
  'Intro.',
  '',
  '## Source revision',
  '',
  'Generic unit.',
  '',
  '## Controls',
  '',
  '- `volume`: a lever.',
  '- `key0` to `key2`: keys.',
  '',
  '## Not modelled',
  '',
  '- Audio',
  '- Memory',
  '',
].join('\n');

describe('readmeProblems', () => {
  it('accepts a README that meets the contract', () => {
    expect(readmeProblems(good, device)).toEqual([]);
  });

  it.each([
    ['a wrong title', good.replace('device-demo', 'device-other'), 'first line'],
    [
      'a missing Source revision',
      good.replace('## Source revision', '## Origin'),
      '"## Source revision" must appear',
    ],
    ['a missing Controls', good.replace('## Controls', '## Keys'), '"## Controls" must appear'],
    [
      'an empty Source revision',
      good.replace('Generic unit.', ''),
      '"## Source revision" is empty',
    ],
    [
      'an undocumented control',
      good.replace('`key0` to `key2`', '`key0` to `key1`'),
      'control "key2"',
    ],
    [
      'an over-wide control range',
      good.replace('`key0` to `key2`', '`key0` to `key9`'),
      'documents "key9"',
    ],
    [
      'a duplicated section',
      `${good}\n## Controls\n\n- \`volume\`: again.\n`,
      '"## Controls" must appear exactly once, found 2',
    ],
    [
      'an empty Controls',
      good.replace('- `volume`: a lever.\n- `key0` to `key2`: keys.\n', ''),
      '"## Controls" is empty',
    ],
    [
      'an empty Not modelled',
      good.replace('- Audio\n- Memory\n', ''),
      '"## Not modelled" is empty',
    ],
    ['a stale control', good.replace('`volume`', '`gain`'), 'documents "gain"'],
    ['a stale not-modelled bullet', good.replace('- Memory', '- Storage'), 'differ'],
    ['a missing not-modelled bullet', good.replace('- Memory\n', ''), 'differ'],
  ])('rejects %s', (_name, readme, fragment) => {
    expect(readmeProblems(readme, device).join('\n')).toContain(fragment);
  });

  it('rejects a device that declares nothing as not modelled', () => {
    const none = { ...device, notModelled: [] };
    const readme = good.replace('- Audio\n- Memory\n', '');
    expect(readmeProblems(readme, none).join('\n')).toContain('declares nothing');
  });
});
