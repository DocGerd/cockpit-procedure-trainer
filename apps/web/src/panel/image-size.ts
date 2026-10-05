import { useEffect, useState } from 'react';
import type { ImageSize } from './rects';

export function isSvgSource(src: string): boolean {
  if (src.startsWith('data:')) return src.startsWith('data:image/svg+xml');
  return /\.svg$/i.test(src.split(/[?#]/)[0] ?? '');
}

export function viewBoxSize(svgText: string): ImageSize | undefined {
  const root = new DOMParser().parseFromString(svgText, 'image/svg+xml').documentElement;
  const values = (root.getAttribute('viewBox') ?? '')
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const [, , width = 0, height = 0] = values;
  return values.length === 4 && values.every(Number.isFinite) && width > 0 && height > 0
    ? { width, height }
    : undefined;
}

/**
 * The coordinate space of a view background: an SVG's viewBox, otherwise the natural size reported
 * on load. A viewBox-only SVG has no natural size in viewBox units, so the browser's cannot be used.
 */
export function useBackgroundSize(src: string) {
  const [viewBox, setViewBox] = useState<ImageSize>();
  const [natural, setNatural] = useState<ImageSize>();

  useEffect(() => {
    if (!isSvgSource(src)) return;
    let current = true;
    fetch(src)
      .then((response) => response.text())
      .then((text) => {
        if (current) setViewBox(viewBoxSize(text));
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [src]);

  return {
    size: viewBox ?? natural,
    onNaturalSize: (size: ImageSize) => {
      if (size.width > 0 && size.height > 0) setNatural(size);
    },
  };
}
