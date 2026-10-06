import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useGallery } from './context';
import type { PlacementSize } from './context';
import { smallestTextPx } from './measure';

export const cellData = (
  widget: string,
  fixture: string,
  kind: string,
  extra: Readonly<Record<string, string>> = {},
) => ({
  'data-gallery-widget': widget,
  'data-gallery-fixture': fixture,
  'data-gallery-kind': kind,
  ...extra,
});

type CellProps = {
  id: string;
  size: PlacementSize;
  caption: string;
  data: Readonly<Record<string, string>>;
  inert?: boolean;
  fit?: 'box' | 'width';
  children: ReactNode;
};

export function Cell({ id, size, caption, data, inert = false, fit = 'box', children }: CellProps) {
  const { threshold, report } = useGallery();
  const box = useRef<HTMLDivElement>(null);
  const [text, setText] = useState<number | undefined>(undefined);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const measure = () => setText(smallestTextPx(element));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [size.px]);

  const small = text !== undefined && threshold !== undefined && text < threshold;

  useEffect(() => {
    report(id, size.id, small);
    return () => report(id, size.id, false);
  }, [id, size.id, small, report]);

  return (
    <figure className="gallery-cell" data-gallery-size={size.id} {...data}>
      <div
        ref={box}
        className="gallery-box"
        data-panel-surface=""
        inert={inert}
        style={fit === 'box' ? { width: size.px, height: size.px } : { width: size.px }}
      >
        {children}
      </div>
      <figcaption>
        {caption}
        {text !== undefined && (
          <span className="gallery-text" data-small={small}>
            {' '}
            text {text} px{small && threshold !== undefined ? ` (below ${threshold} px)` : ''}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
