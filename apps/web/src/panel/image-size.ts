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
  const [x = 0, y = 0, width = 0, height = 0] = values;
  return values.length === 4 && values.every(Number.isFinite) && width > 0 && height > 0
    ? { x, y, width, height }
    : undefined;
}

type Known = { readonly src: string; readonly size: ImageSize | undefined };

const sizeFor = (known: Known | undefined, src: string) =>
  known?.src === src ? known.size : undefined;

/**
 * The coordinate space of a view background: an SVG's viewBox, a raster image's natural size.
 * A viewBox-only SVG has no natural size in viewBox units, so the browser's is never used for one.
 */
export function useBackgroundSize(src: string) {
  const svg = isSvgSource(src);
  const [viewBox, setViewBox] = useState<Known>();
  const [natural, setNatural] = useState<Known>();

  useEffect(() => {
    if (!svg) return;
    let current = true;
    fetch(src)
      .then((response) => (response.ok ? response.text() : Promise.reject(new Error(src))))
      .then((text) => {
        if (current) setViewBox({ src, size: viewBoxSize(text) });
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [src, svg]);

  return {
    size: sizeFor(svg ? viewBox : natural, src),
    onNaturalSize: (size: ImageSize) => {
      if (size.width > 0 && size.height > 0) setNatural({ src, size });
    },
  };
}
