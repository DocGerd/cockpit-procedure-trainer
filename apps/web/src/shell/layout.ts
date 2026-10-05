import { useEffect, useState } from 'react';

export const DESKTOP_MIN_WIDTH = 1200;

export type Layout = 'desktop' | 'tablet';

const current = (): Layout => (window.innerWidth >= DESKTOP_MIN_WIDTH ? 'desktop' : 'tablet');

export function useLayout(): Layout {
  const [layout, setLayout] = useState(current);
  useEffect(() => {
    const onResize = () => setLayout(current());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return layout;
}
