import { describe, expect, it } from 'vitest';
import { inlinedSvgs, normalizeSvg } from './inlined-svg';

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

describe('normalizeSvg', () => {
  const source = "<svg xmlns='http://www.w3.org/2000/svg'>\n  <text x='1'>Hi</text>\n</svg>\n";

  it('makes a source and its inlined copy compare equal despite a trailing newline', () => {
    const script = `a="data:image/svg+xml,${encodeURIComponent(source)}";`;
    const [inlined = ''] = inlinedSvgs(script);
    expect(inlined).not.toBe(normalizeSvg(source));
    expect(normalizeSvg(inlined)).toBe(normalizeSvg(source));
  });

  it('drops whitespace between tags and around the document', () => {
    expect(normalizeSvg(source)).toBe(svg);
  });

  it('keeps whitespace inside text content', () => {
    expect(normalizeSvg('<svg><text> a  b </text></svg>')).toBe('<svg><text> a  b </text></svg>');
  });
});
