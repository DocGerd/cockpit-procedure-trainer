// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readTokenPx, smallestTextPx } from './measure';

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function svgWith(viewBox: string, ...sizes: string[]) {
  const root = document.createElement('div');
  root.innerHTML = `<svg viewBox="${viewBox}">${sizes.map((size) => `<text data-size="${size}">x</text>`).join('')}</svg>`;
  document.body.append(root);
  return root;
}

function stub(width: number, height: number) {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    width,
    height,
  } as DOMRect);
  vi.spyOn(window, 'getComputedStyle').mockImplementation(
    (element) =>
      ({
        fontSize: `${(element as HTMLElement).dataset['size']}px`,
        getPropertyValue: () => ' 11px',
      }) as unknown as CSSStyleDeclaration,
  );
}

describe('smallestTextPx', () => {
  it('scales the font size by the rendered size of the viewBox', () => {
    stub(50, 50);
    expect(smallestTextPx(svgWith('0 0 100 100', '12'))).toBe(6);
  });

  it('takes the smallest of several texts', () => {
    stub(50, 50);
    expect(smallestTextPx(svgWith('0 0 100 100', '12', '8', '20'))).toBe(4);
  });

  it('scales by the limiting side when the box does not match the viewBox ratio', () => {
    stub(100, 20);
    expect(smallestTextPx(svgWith('0 0 100 40', '12'))).toBe(6);
  });

  it('is undefined without layout or without text', () => {
    stub(0, 0);
    expect(smallestTextPx(svgWith('0 0 100 100', '12'))).toBeUndefined();
    stub(50, 50);
    expect(smallestTextPx(svgWith('0 0 100 100'))).toBeUndefined();
  });
});

describe('readTokenPx', () => {
  it('reads a pixel token from the root element', () => {
    stub(1, 1);
    expect(readTokenPx('--text-2xs')).toBe(11);
  });

  it('is undefined for a missing token', () => {
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      () => ({ getPropertyValue: () => '' }) as unknown as CSSStyleDeclaration,
    );
    expect(readTokenPx('--missing')).toBeUndefined();
  });
});
