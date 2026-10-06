// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isSvgSource, useBackgroundSize, viewBoxSize } from './image-size';

describe('isSvgSource', () => {
  it.each([
    ['panel.svg', true],
    ['/assets/view-panel-1a2b.svg?import', true],
    ['panel.SVG#top', true],
    ['data:image/svg+xml,%3csvg%3e', true],
    ['panel.png', false],
    ['data:image/png;base64,AAAA', false],
    ['svg/panel.png', false],
  ])('%s is %s', (src, expected) => {
    expect(isSvgSource(src)).toBe(expected);
  });
});

describe('viewBoxSize', () => {
  const svg = (attributes: string) => `<svg xmlns="http://www.w3.org/2000/svg" ${attributes}/>`;

  it('reads the viewBox width and height', () => {
    expect(viewBoxSize(svg('viewBox="0 0 1200 640"'))).toEqual({
      x: 0,
      y: 0,
      width: 1200,
      height: 640,
    });
    expect(viewBoxSize(svg('viewBox=" -10,-5, 160 , 90 "'))).toEqual({
      x: -10,
      y: -5,
      width: 160,
      height: 90,
    });
  });

  it.each([
    ['no viewBox', svg('width="10" height="10"')],
    ['a zero width', svg('viewBox="0 0 0 90"')],
    ['a negative height', svg('viewBox="0 0 160 -90"')],
    ['three numbers', svg('viewBox="0 0 160"')],
    ['five numbers', svg('viewBox="0 0 160 90 1"')],
    ['a word', svg('viewBox="0 0 wide 90"')],
    ['not SVG', 'hello'],
  ])('is undefined for %s', (_, text) => {
    expect(viewBoxSize(text)).toBeUndefined();
  });
});

describe('useBackgroundSize', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('ignores the answer for a source it no longer shows', async () => {
    const answers = new Map<string, (text: string) => void>();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (src: string) =>
          new Promise((resolve) => {
            answers.set(src, (text) => resolve({ ok: true, text: () => Promise.resolve(text) }));
          }),
      ),
    );
    const { result, rerender } = renderHook(({ src }) => useBackgroundSize(src), {
      initialProps: { src: 'a.svg' },
    });
    rerender({ src: 'b.svg' });

    await act(async () => answers.get('b.svg')?.('<svg viewBox="0 0 20 10"/>'));
    await act(async () => answers.get('a.svg')?.('<svg viewBox="0 0 99 99"/>'));

    expect(result.current.size).toEqual({ x: 0, y: 0, width: 20, height: 10 });
  });
});
