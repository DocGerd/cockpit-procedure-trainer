import type { ControlPosition } from '@cpt/core';
import { controlWidgets } from '@cpt/panel-kit';
import { Cell, cellData } from './Cell';
import { SIZES, useGallery } from './context';
import type { PlacementSize } from './context';
import { controlFixtures, samplesOf } from './fixtures';
import type { ControlFixture } from './fixtures';
import { useLocalControl } from './use-local-control';
import type { ControlHandlers } from './use-local-control';

const idle: ControlHandlers = {
  onSet: () => {},
  onPress: () => {},
  onRelease: () => {},
  onOpenGuard: () => {},
  onCloseGuard: () => {},
};

type InstanceProps = {
  fixture: ControlFixture;
  position: ControlPosition;
  guardOpen: boolean;
  label: string;
  handlers: ControlHandlers;
};

function ControlInstance({ fixture, position, guardOpen, label, handlers }: InstanceProps) {
  const Widget = controlWidgets[fixture.widget];
  if (!Widget) return null;
  return (
    <Widget
      control={fixture.control}
      position={position}
      guardOpen={guardOpen}
      label={label}
      placard={(fixture.control.placard ?? fixture.control.name).en}
      positionLabels={fixture.labels}
      {...handlers}
    />
  );
}

const positionName = (fixture: ControlFixture, position: ControlPosition) =>
  fixture.labels[String(position)] ?? String(position);

function ControlCard({ fixture }: { fixture: ControlFixture }) {
  const { size } = useGallery();
  const live = useLocalControl(fixture.control);
  const samples = samplesOf(fixture.control);
  const guarded = fixture.control.kind === 'guarded';
  const data = (kind: string, extra: Record<string, string> = {}) =>
    cellData(fixture.widget, fixture.id, kind, extra);

  const staticCell = (position: ControlPosition, guardOpen: boolean) => {
    const guard = guardOpen ? 'open' : 'closed';
    const name = `${positionName(fixture, position)}${guarded ? `, guard ${guard}` : ''}`;
    return (
      <Cell
        key={`${String(position)}:${guard}`}
        id={`${fixture.id}:position:${String(position)}:${guard}`}
        size={size}
        caption={name}
        inert
        data={data('position', {
          'data-gallery-position': String(position),
          'data-gallery-guard': guard,
        })}
      >
        <ControlInstance
          fixture={fixture}
          position={position}
          guardOpen={guardOpen}
          label={`${fixture.title}, ${name}`}
          handlers={idle}
        />
      </Cell>
    );
  };

  const liveCell = (placement: PlacementSize) => (
    <Cell
      key={placement.id}
      id={`${fixture.id}:live:${placement.id}`}
      size={placement}
      caption={`${placement.name}, ${positionName(fixture, live.position)}`}
      data={data('live')}
    >
      <ControlInstance
        fixture={fixture}
        position={live.position}
        guardOpen={live.guardOpen}
        label={`${fixture.title}, ${placement.name}`}
        handlers={live.handlers}
      />
    </Cell>
  );

  return (
    <article className="gallery-card" data-gallery-card={fixture.id}>
      <h4>{fixture.title}</h4>
      <p className="gallery-label">Operable at every placement size, sharing one state</p>
      <div className="gallery-row">{SIZES.map(liveCell)}</div>
      <p className="gallery-label">
        Every position at {size.name.toLowerCase()} size ({size.px} px)
      </p>
      <div className="gallery-row">
        {samples.map((position) => staticCell(position, false))}
        {guarded && samples.map((position) => staticCell(position, true))}
      </div>
    </article>
  );
}

export function ControlSection() {
  return (
    <section aria-labelledby="gallery-controls">
      <h2 id="gallery-controls">Controls</h2>
      {Object.keys(controlWidgets).map((widget) => {
        const fixtures = controlFixtures.filter((fixture) => fixture.widget === widget);
        return (
          <section key={widget} className="gallery-group" data-gallery-group={widget}>
            <h3>{widget}</h3>
            {fixtures.length === 0 && <p role="alert">No fixture for the widget {widget}.</p>}
            {fixtures.map((fixture) => (
              <ControlCard key={fixture.id} fixture={fixture} />
            ))}
          </section>
        );
      })}
    </section>
  );
}
