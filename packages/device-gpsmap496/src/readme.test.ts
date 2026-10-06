import { describe, expect, it } from 'vitest';
import readme from '../README.md?raw';
import { gpsmap496Device } from './logic';

const bullets = (heading: string): string[] => {
  const [, rest = ''] = readme.split(`## ${heading}\n`);
  const [body = ''] = rest.split('\n## ');
  return body
    .split('\n')
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2));
};

describe('README', () => {
  it('lists exactly the functions the device declares as not modelled', () => {
    expect(bullets('Not modelled')).toEqual(gpsmap496Device.notModelled.map((entry) => entry.en));
  });

  it('names the source revision', () => {
    expect(readme).toContain('## Source revision');
  });
});
