import type { IndicatorValue, JsonObject } from '@cpt/core';
import { indicatorWidgets } from '@cpt/panel-kit';
import { useState } from 'react';
import { Cell, cellData } from './Cell';
import { SIZES, useGallery } from './context';
import type { PlacementSize } from './context';
import { indicatorFixtures } from './fixtures';
import type { IndicatorFixture } from './fixtures';
import { ValueInput } from './ValueInput';

type InstanceProps = {
  widget: string;
  label: string;
  value: IndicatorValue;
  options: JsonObject;
};

function IndicatorInstance({ widget, label, value, options }: InstanceProps) {
  const Widget = indicatorWidgets[widget];
  if (!Widget) return null;
  return <Widget value={value} label={label} options={options} />;
}

function IndicatorCard({ fixture }: { fixture: IndicatorFixture }) {
  const { size } = useGallery();
  const [value, setValue] = useState(fixture.initial);
  const data = (kind: string, extra: Record<string, string> = {}) =>
    cellData(fixture.widget, fixture.id, kind, extra);

  const liveCell = (placement: PlacementSize) => (
    <Cell
      key={placement.id}
      id={`${fixture.id}:live:${placement.id}`}
      size={placement}
      caption={placement.name}
      data={data('live')}
    >
      <IndicatorInstance
        widget={fixture.widget}
        label={fixture.label}
        value={value}
        options={fixture.options}
      />
    </Cell>
  );

  return (
    <article className="gallery-card" data-gallery-card={fixture.id}>
      <h4>{fixture.title}</h4>
      <ValueInput kind={fixture.input} value={value} name={fixture.label} onChange={setValue} />
      <p className="gallery-label">Driven by the input above at every placement size</p>
      <div className="gallery-row">{SIZES.map(liveCell)}</div>
      <p className="gallery-label">
        Value classes at {size.name.toLowerCase()} size ({size.px} px)
      </p>
      <div className="gallery-row">
        {fixture.samples.map((sample) => (
          <Cell
            key={sample.name}
            id={`${fixture.id}:sample:${sample.name}`}
            size={size}
            caption={sample.name}
            inert
            data={data('sample', { 'data-gallery-sample': sample.name })}
          >
            <IndicatorInstance
              widget={fixture.widget}
              label={fixture.label}
              value={sample.value}
              options={sample.options ?? fixture.options}
            />
          </Cell>
        ))}
      </div>
    </article>
  );
}

export function IndicatorSection() {
  return (
    <section aria-labelledby="gallery-indicators">
      <h2 id="gallery-indicators">Indicators</h2>
      {Object.keys(indicatorWidgets).map((widget) => {
        const fixtures = indicatorFixtures.filter((fixture) => fixture.widget === widget);
        return (
          <section key={widget} className="gallery-group" data-gallery-group={widget}>
            <h3>{widget}</h3>
            {fixtures.length === 0 && <p role="alert">No fixture for the widget {widget}.</p>}
            {fixtures.map((fixture) => (
              <IndicatorCard key={fixture.id} fixture={fixture} />
            ))}
          </section>
        );
      })}
    </section>
  );
}
