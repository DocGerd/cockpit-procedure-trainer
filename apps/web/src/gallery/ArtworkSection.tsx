import type { IndicatorValue } from '@cpt/core';
import {
  ArtworkControl,
  ArtworkIndicator,
  defaultControlWidget,
  defaultIndicatorWidget,
} from '@cpt/panel-kit';
import { useMemo, useState } from 'react';
import { artworkFixtures } from './art';
import type { ArtworkControlFixture, ArtworkIndicatorFixture } from './art';
import { Cell, cellData } from './Cell';
import { SIZES } from './context';
import type { PlacementSize } from './context';
import { useLocalControl } from './use-local-control';
import { ValueInput } from './ValueInput';

function ArtworkControlCard({ fixture }: { fixture: ArtworkControlFixture }) {
  const live = useLocalControl(fixture.control);
  const Generic = defaultControlWidget(fixture.control.kind);

  const liveCell = (placement: PlacementSize) => {
    const props = {
      control: fixture.control,
      position: live.position,
      guardOpen: live.guardOpen,
      label: fixture.title,
      positionLabels: fixture.labels,
      ...live.handlers,
    };
    return (
      <Cell
        key={placement.id}
        id={`${fixture.id}:live:${placement.id}`}
        size={placement}
        caption={placement.name}
        fit="width"
        data={cellData('artwork', fixture.id, 'live')}
      >
        <ArtworkControl
          {...props}
          artwork={fixture.artwork}
          fallback={
            <div className="gallery-fallback" data-gallery-fallback="">
              <Generic {...props} />
            </div>
          }
        />
      </Cell>
    );
  };

  return (
    <article className="gallery-card" data-gallery-card={fixture.id}>
      <h4>{fixture.title}</h4>
      <div className="gallery-row">{SIZES.map(liveCell)}</div>
    </article>
  );
}

function ArtworkIndicatorCard({ fixture }: { fixture: ArtworkIndicatorFixture }) {
  const [value, setValue] = useState<IndicatorValue>(fixture.initial);
  const Generic = defaultIndicatorWidget(value);

  const liveCell = (placement: PlacementSize) => (
    <Cell
      key={placement.id}
      id={`${fixture.id}:live:${placement.id}`}
      size={placement}
      caption={placement.name}
      fit="width"
      data={cellData('artwork', fixture.id, 'live')}
    >
      <ArtworkIndicator
        value={value}
        label={fixture.label}
        artwork={fixture.artwork}
        fallback={<Generic value={value} label={fixture.label} options={fixture.fallbackOptions} />}
      />
    </Cell>
  );

  return (
    <article className="gallery-card" data-gallery-card={fixture.id}>
      <h4>{fixture.title}</h4>
      <ValueInput kind={fixture.input} value={value} name={fixture.label} onChange={setValue} />
      <div className="gallery-row">{SIZES.map(liveCell)}</div>
    </article>
  );
}

export function ArtworkSection() {
  const fixtures = useMemo(artworkFixtures, []);
  return (
    <section aria-labelledby="gallery-artwork">
      <h2 id="gallery-artwork">Artwork renderer</h2>
      <p className="gallery-note">
        Self-drawn fixture images, built from the panel tokens. The face is static; the moving part
        follows the value.
      </p>
      <section className="gallery-group" data-gallery-group="artwork-controls">
        <h3>Artwork controls</h3>
        {fixtures.controls.map((fixture) => (
          <ArtworkControlCard key={fixture.id} fixture={fixture} />
        ))}
      </section>
      <section className="gallery-group" data-gallery-group="artwork-indicators">
        <h3>Artwork indicators</h3>
        {fixtures.indicators.map((fixture) => (
          <ArtworkIndicatorCard key={fixture.id} fixture={fixture} />
        ))}
      </section>
    </section>
  );
}
