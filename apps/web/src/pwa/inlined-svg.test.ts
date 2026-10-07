import { describe, expect, it } from 'vitest';
import { inlinedSvgMatcher, inlinedSvgs } from './inlined-svg';

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

describe('inlinedSvgMatcher', () => {
  const source = "<svg xmlns='http://www.w3.org/2000/svg'>\n  <text x='1'>Hi</text>\n</svg>\n";

  it('matches a raw source with indentation and a trailing newline to its URL-encoded copy', () => {
    const script = `a="data:image/svg+xml,${encodeURIComponent(source)}";`;
    expect(inlinedSvgMatcher(script)(source)).toBe(true);
  });

  it('matches it to a base64 copy', () => {
    const script = `a="data:image/svg+xml;base64,${Buffer.from(source).toString('base64')}";`;
    expect(inlinedSvgMatcher(script)(source)).toBe(true);
  });

  it('matches when only the source ends in a newline', () => {
    const script = `a="data:image/svg+xml,${encodeURIComponent(source.trim())}";`;
    expect(inlinedSvgMatcher(script)(source)).toBe(true);
  });

  it('does not match a different SVG', () => {
    const script = `a="data:image/svg+xml,${encodeURIComponent(source)}";`;
    expect(inlinedSvgMatcher(script)(source.replace('Hi', 'Ho'))).toBe(false);
  });
});
