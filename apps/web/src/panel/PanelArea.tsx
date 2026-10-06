import type { Aircraft } from '@cpt/core';
import { Fragment, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { DeviceLayer } from '../devices/DeviceLayer';
import { ImageWithFallback } from '../errors/ImageWithFallback';
import { useLocalize, useMessages } from '../i18n';
import { PanelOverlay } from '../modes/PanelOverlay';
import { useTrainer } from '../trainer';
import { ActiveViewContext } from './active-view';
import type { ActiveView } from './active-view';
import { fitStyle, usePageTop } from './fit';
import { useBackgroundSize } from './image-size';
import { messages } from './messages';
import { ControlPlacement, IndicatorPlacement } from './placements';
import { panelRects, placementExtent, viewPlacements } from './rects';
import './panel.css';

function useViewState(aircraft: Aircraft): ActiveView {
  const viewIds = Object.keys(aircraft.views);
  const [chosen, setChosen] = useState<{ aircraftId: string; viewId: string }>();
  const current =
    chosen?.aircraftId === aircraft.id && Object.hasOwn(aircraft.views, chosen.viewId)
      ? chosen.viewId
      : (viewIds[0] ?? '');
  return useMemo(
    () => ({
      viewId: current,
      setView: (viewId: string) => {
        if (Object.hasOwn(aircraft.views, viewId)) setChosen({ aircraftId: aircraft.id, viewId });
      },
    }),
    [aircraft, current],
  );
}

function ViewTabs({ active, panelId }: { active: ActiveView; panelId: string }) {
  const { aircraft } = useTrainer();
  const text = useMessages(messages);
  const localize = useLocalize();
  const tabs = useRef(new Map<string, HTMLButtonElement>());
  const viewIds = Object.keys(aircraft.views);

  const onKeyDown = (event: KeyboardEvent) => {
    const index = viewIds.indexOf(active.viewId);
    const last = viewIds.length - 1;
    const target = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key];
    const viewId = target === undefined ? undefined : viewIds[target];
    if (viewId === undefined) return;
    event.preventDefault();
    active.setView(viewId);
    tabs.current.get(viewId)?.focus();
  };

  return (
    <div role="tablist" aria-label={text.viewTabs} className="panel-tabs" onKeyDown={onKeyDown}>
      {Object.entries(aircraft.views).map(([viewId, view]) => {
        const selected = viewId === active.viewId;
        return (
          <button
            key={viewId}
            ref={(element) => {
              if (element) tabs.current.set(viewId, element);
              else tabs.current.delete(viewId);
            }}
            type="button"
            role="tab"
            id={`${panelId}-${viewId}`}
            className="panel-tab"
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => active.setView(viewId)}
          >
            {localize(view.name)}
          </button>
        );
      })}
    </div>
  );
}

function PanelView({ viewId }: { viewId: string }) {
  const { aircraft } = useTrainer();
  const localize = useLocalize();
  const view = aircraft.views[viewId];
  const placements = useMemo(() => viewPlacements(aircraft, viewId), [aircraft, viewId]);
  const background = useBackgroundSize(view?.image ?? '');
  const extent = useMemo(() => placementExtent(placements), [placements]);
  const size = background.size ?? extent;
  const rects = useMemo(() => panelRects(placements, size), [placements, size]);
  const stage = useRef<HTMLDivElement>(null);
  const top = usePageTop(stage);
  if (!view) return null;
  const name = localize(view.name);

  return (
    <div ref={stage} className="panel-stage" style={fitStyle(size, top)}>
      <Fragment key={`${aircraft.id}/${viewId}`}>
        <ImageWithFallback
          src={view.image}
          label={name}
          className="panel-image"
          draggable={false}
          onLoad={(event) => {
            const { naturalWidth: width, naturalHeight: height } = event.currentTarget;
            background.onNaturalSize({ width, height });
          }}
        />
        {Object.entries(rects.controls).map(([id, box]) => {
          const control = aircraft.controls[id];
          return control && <ControlPlacement key={id} id={id} control={control} box={box} />;
        })}
        {Object.entries(rects.indicators).map(([id, box]) => {
          const indicator = aircraft.indicators[id];
          return (
            indicator && <IndicatorPlacement key={id} id={id} indicator={indicator} box={box} />
          );
        })}
      </Fragment>
      <DeviceLayer viewId={viewId} rects={rects} />
      <PanelOverlay viewId={viewId} rects={rects} />
    </div>
  );
}

export function PanelArea() {
  const { aircraft } = useTrainer();
  const active = useViewState(aircraft);
  const panelId = useId();

  return (
    <ActiveViewContext.Provider value={active}>
      <ViewTabs active={active} panelId={panelId} />
      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={`${panelId}-${active.viewId}`}
        className="panel-surface"
        data-panel-surface=""
      >
        <PanelView viewId={active.viewId} />
      </div>
    </ActiveViewContext.Provider>
  );
}
