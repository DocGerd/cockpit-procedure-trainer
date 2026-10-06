import { describe, expect, it } from 'vitest';
import { inlinedSvgs } from './inlined-svg';

const svg = '<svg xmlns="http://www.w3.org/2000/svg"><text x="1">Hi</text></svg>';

describe('inlinedSvgs', () => {
  it('decodes a URL-encoded data URI', () => {
    const script = `a="data:image/svg+xml,${encodeURIComponent(svg.replaceAll('"', "'"))}";`;
    expect(inlinedSvgs(script)).toEqual([svg]);
  });

  it('decodes a base64 data URI of a small SVG containing text', () => {
    const script = `a="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}";`;
    expect(inlinedSvgs(script)).toEqual([svg]);
  });
});
