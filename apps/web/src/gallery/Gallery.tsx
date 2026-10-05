import { useCallback, useMemo, useState } from 'react';
import { ArtworkSection } from './ArtworkSection';
import { ControlSection } from './ControlSection';
import { GalleryContext, SIZES } from './context';
import { IndicatorSection } from './IndicatorSection';
import { readTokenPx } from './measure';

const SMALLEST_TYPE_TOKEN = '--text-2xs';

export function Gallery() {
  const [sizeId, setSizeId] = useState<string>('medium');
  const [threshold] = useState(() => readTokenPx(SMALLEST_TYPE_TOKEN));
  const [small, setSmall] = useState<ReadonlyMap<string, string>>(new Map());

  const report = useCallback((key: string, cellSize: string, isSmall: boolean) => {
    setSmall((previous) => {
      if (previous.has(key) === isSmall) return previous;
      const next = new Map(previous);
      if (isSmall) next.set(key, cellSize);
      else next.delete(key);
      return next;
    });
  }, []);

  const size = SIZES.find((candidate) => candidate.id === sizeId) ?? SIZES[2];
  const value = useMemo(() => ({ size, threshold, report }), [size, threshold, report]);
  const countAt = (id: string) => [...small.values()].filter((cell) => cell === id).length;

  return (
    <GalleryContext value={value}>
      <div className="gallery">
        <header className="gallery-header">
          <h1>Panel kit gallery</h1>
          <p className="gallery-note">
            Development page, served by the dev server only. Every generic control and indicator,
            operable, on the panel surface.
          </p>
          <fieldset className="gallery-sizes">
            <legend>Placement size for the position and value matrices</legend>
            {SIZES.map((candidate) => (
              <label key={candidate.id} className="gallery-choice">
                <input
                  type="radio"
                  name="gallery-size"
                  value={candidate.id}
                  checked={candidate.id === sizeId}
                  onChange={() => setSizeId(candidate.id)}
                />
                {candidate.name} ({candidate.px} px)
              </label>
            ))}
          </fieldset>
          <section aria-labelledby="gallery-legibility" className="gallery-legibility">
            <h2 id="gallery-legibility">Legibility</h2>
            <p className="gallery-note">
              Operable and matrix cells whose smallest rendered text is below{' '}
              {threshold === undefined ? 'the smallest type token' : `${threshold} px`}, by size.
            </p>
            <ul data-gallery-legibility="">
              {SIZES.map((candidate) => (
                <li key={candidate.id} data-gallery-size={candidate.id}>
                  {candidate.name}: {countAt(candidate.id)}
                </li>
              ))}
            </ul>
          </section>
        </header>
        <main>
          <ControlSection />
          <IndicatorSection />
          <ArtworkSection />
        </main>
      </div>
    </GalleryContext>
  );
}
