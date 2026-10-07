import type { Aircraft } from '@cpt/core';
import { printsText } from '@cpt/panel-kit';
import { Fragment, useCallback, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, RefObject } from 'react';
import { DeviceLayer } from '../devices/DeviceLayer';
import { Dock } from '../devices/Dock';
import { DockProvider, useDock } from '../devices/dock-state';
import { ImageWithFallback } from '../errors/ImageWithFallback';
import { useLocalize, useMessages } from '../i18n';
import { GuidedDock } from '../modes/GuidedDock';
import { PanelOverlay } from '../modes/PanelOverlay';
import { useTrainer } from '../trainer';
import { ActiveViewContext } from './active-view';
import type { CockpitLayoutChoice, CombinedCell } from './cockpit-layout';
import type { ActiveView } from './active-view';
import { cellFitStyle, fitStyle, usePageFit } from './fit';
import { useBackgroundSize } from './image-size';
import { messages } from './messages';
import {
  PanelRevealProvider,
  PanelZoomContext,
  useZoomMap,
  useZoomState,
  zoomStyle,
} from './panel-zoom';
import type { PanelZoom } from './panel-zoom';
import { ControlPlacement, IndicatorPlacement } from './placements';
import { panelRects, placementExtent, viewPlacements } from './rects';
import { createTouchGate, TouchGateContext } from './touch-gate';
import type { TouchGate } from './touch-gate';
import { useZoomGestures } from './use-zoom-gestures';
import type { ZoomTarget } from './use-zoom-gestures';
import { isZoomed, keyZoom, NO_ZOOM, sameZoom } from './zoom';
import type { ZoomState } from './zoom';
import './panel.css';

function useViewState(aircraft: Aircraft, combined: boolean): ActiveView {
  const viewIds = Object.keys(aircraft.views);
  const [chosen, setChosen] = useState<{ aircraftId: string; viewId: string }>();
  const current =
    chosen?.aircraftId === aircraft.id && Object.hasOwn(aircraft.views, chosen.viewId)
      ? chosen.viewId
      : (viewIds[0] ?? '');
  return useMemo(
    () => ({
      viewId: current,
      combined,
      setView: (viewId: string) => {
        if (combined) return;
        if (Object.hasOwn(aircraft.views, viewId)) setChosen({ aircraftId: aircraft.id, viewId });
      },
      visible: (viewId: string) => combined || viewId === current,
    }),
    [aircraft, current, combined],
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

function PanelView({
  viewId,
  zoom,
  gate,
  cellHeight,
}: {
  viewId: string;
  zoom: ZoomTarget;
  gate: TouchGate;
  /** Set in the combined layout: the height of the cell the view is contain-fit in. */
  cellHeight?: number;
}) {
  const { aircraft } = useTrainer();
  const localize = useLocalize();
  const view = aircraft.views[viewId];
  const placements = useMemo(() => viewPlacements(aircraft, viewId), [aircraft, viewId]);
  const background = useBackgroundSize(view?.image ?? '', view?.size);
  const extent = useMemo(() => placementExtent(placements), [placements]);
  const size = background.size ?? extent;
  const rects = useMemo(() => panelRects(placements, size), [placements, size]);
  const stage = useRef<HTMLDivElement>(null);
  const pageFit = usePageFit(stage);
  const { reveal, ...gestures } = useZoomGestures(stage, zoom, gate);
  if (!view) return null;
  const name = localize(view.name);

  return (
    <div
      ref={stage}
      className="panel-stage"
      style={cellHeight === undefined ? fitStyle(size, pageFit) : cellFitStyle(size, cellHeight)}
      data-fit={cellHeight === undefined ? undefined : 'cell'}
      data-zoomed={isZoomed(zoom.zoom) ? '' : undefined}
      {...gestures}
    >
      <div
        className="panel-zoom"
        style={zoomStyle(zoom.zoom)}
        data-zoomed={isZoomed(zoom.zoom) ? '' : undefined}
      >
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
            return (
              control && (
                <ControlPlacement
                  key={id}
                  id={id}
                  control={control}
                  box={box}
                  viewPrintsLabel={printsText(view.controls?.[id]?.printed)}
                />
              )
            );
          })}
          {Object.entries(rects.indicators).map(([id, box]) => {
            const indicator = aircraft.indicators[id];
            return (
              indicator && <IndicatorPlacement key={id} id={id} indicator={indicator} box={box} />
            );
          })}
        </Fragment>
        <DeviceLayer viewId={viewId} rects={rects} />
        <PanelRevealProvider value={reveal}>
          <PanelOverlay viewId={viewId} rects={rects} />
        </PanelRevealProvider>
      </div>
    </div>
  );
}

const TABS: CockpitLayoutChoice = { kind: 'tabs' };

// Keys reach the surface only while it has focus itself; a focused control keeps its own keys.
function zoomKeyHandler(zoom: ZoomState, apply: (next: ZoomState) => void) {
  return (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const viewport = event.currentTarget.firstElementChild?.getBoundingClientRect();
    if (!viewport) return;
    const next = keyZoom(zoom, event.key, viewport);
    if (next === undefined || sameZoom(next, zoom)) return;
    event.preventDefault();
    apply(next);
  };
}

function CockpitCellView({
  cell,
  panelId,
  zoom,
  applyZoom,
  gate,
}: {
  cell: CombinedCell;
  panelId: string;
  zoom: ZoomState;
  applyZoom(viewId: string, next: ZoomState): void;
  gate: TouchGate;
}) {
  const { aircraft } = useTrainer();
  const localize = useLocalize();
  const view = aircraft.views[cell.viewId];
  const { viewId } = cell;
  const apply = useCallback((next: ZoomState) => applyZoom(viewId, next), [applyZoom, viewId]);
  const target = useMemo(() => ({ zoom, apply }), [zoom, apply]);
  const value = useMemo<PanelZoom>(
    () => ({ scale: zoom.scale, offset: zoom.offset, reset: () => apply(NO_ZOOM) }),
    [zoom, apply],
  );
  return (
    <div
      role="region"
      id={`${panelId}-${viewId}`}
      aria-label={view ? localize(view.name) : viewId}
      aria-describedby={`${panelId}-keys`}
      tabIndex={0}
      className="panel-cell"
      data-view={viewId}
      data-panel-surface=""
      style={{ left: cell.left, top: cell.top, width: cell.width, height: cell.height }}
      onKeyDown={zoomKeyHandler(zoom, apply)}
    >
      <PanelZoomContext.Provider value={value}>
        <PanelView viewId={viewId} zoom={target} gate={gate} cellHeight={cell.height} />
      </PanelZoomContext.Provider>
    </div>
  );
}

function CombinedCockpit({
  layout,
  frame,
  gate,
}: {
  layout: Extract<CockpitLayoutChoice, { kind: 'combined' }>;
  frame: RefObject<HTMLDivElement | null>;
  gate: TouchGate;
}) {
  const { aircraft } = useTrainer();
  const text = useMessages(messages);
  const panelId = useId();
  const zooms = useZoomMap(aircraft.id);
  const zoomed = layout.cells.filter((cell) => isZoomed(zooms.of(cell.viewId)));

  const resetZoom = () => {
    const first = zoomed[0];
    zooms.reset();
    if (first) document.getElementById(`${panelId}-${first.viewId}`)?.focus();
  };

  return (
    <div ref={frame} className="panel-surface" data-cockpit="combined">
      {zoomed.length > 0 && (
        <button type="button" className="chrome-button panel-zoom-reset" onClick={resetZoom}>
          {text.resetZoom}
        </button>
      )}
      <TouchGateContext.Provider value={gate}>
        <div className="panel-cockpit" style={{ width: layout.width, height: layout.height }}>
          {layout.cells.map((cell) => (
            <CockpitCellView
              key={cell.viewId}
              cell={cell}
              panelId={panelId}
              zoom={zooms.of(cell.viewId)}
              applyZoom={zooms.apply}
              gate={gate}
            />
          ))}
          <Dock place={layout.dock} />
        </div>
      </TouchGateContext.Provider>
      <span id={`${panelId}-keys`} hidden>
        {text.zoomKeys}
      </span>
    </div>
  );
}

function TabbedCockpit({
  active,
  frame,
  gate,
}: {
  active: ActiveView;
  frame: RefObject<HTMLDivElement | null>;
  gate: TouchGate;
}) {
  const { aircraft } = useTrainer();
  const panelId = useId();
  const text = useMessages(messages);
  const zoom = useZoomState(`${aircraft.id}/${active.viewId}`);
  const dock = useDock();

  const resetZoom = () => {
    zoom.reset();
    document.getElementById(`${panelId}-${active.viewId}`)?.focus();
  };

  return (
    <PanelZoomContext.Provider value={zoom.value}>
      <div className="panel-bar">
        <ViewTabs active={active} panelId={panelId} />
        {isZoomed(zoom.zoom) && (
          <button type="button" className="chrome-button panel-zoom-reset" onClick={resetZoom}>
            {text.resetZoom}
          </button>
        )}
      </div>
      <div
        ref={frame}
        role="tabpanel"
        id={panelId}
        aria-labelledby={`${panelId}-${active.viewId}`}
        aria-describedby={`${panelId}-keys`}
        tabIndex={0}
        className="panel-surface"
        data-panel-surface=""
        data-view={active.viewId}
        data-dock-below={dock?.available ? '' : undefined}
        onKeyDown={zoomKeyHandler(zoom.zoom, zoom.apply)}
      >
        <TouchGateContext.Provider value={gate}>
          <PanelView viewId={active.viewId} zoom={zoom} gate={gate} />
        </TouchGateContext.Provider>
        <span id={`${panelId}-keys`} hidden>
          {text.zoomKeys}
        </span>
      </div>
      <Dock />
    </PanelZoomContext.Provider>
  );
}

export type PanelAreaProps = {
  /** How the cockpit is laid out; tabs when absent. */
  layout?: CockpitLayoutChoice;
  /** The element that frames the cockpit in either layout, so its padding can be measured. */
  frame?: RefObject<HTMLDivElement | null>;
};

export function PanelArea({ layout = TABS, frame }: PanelAreaProps) {
  const { aircraft } = useTrainer();
  const combined = layout.kind === 'combined';
  const active = useViewState(aircraft, combined);
  const gate = useMemo(createTouchGate, []);
  const fallback = useRef<HTMLDivElement>(null);
  const ref = frame ?? fallback;

  const dockAvailable =
    layout.kind === 'combined' ? layout.dock !== undefined : aircraft.cockpit?.dock !== undefined;

  return (
    <ActiveViewContext.Provider value={active}>
      <DockProvider available={dockAvailable}>
        <GuidedDock />
        {layout.kind === 'combined' ? (
          <CombinedCockpit layout={layout} frame={ref} gate={gate} />
        ) : (
          <TabbedCockpit active={active} frame={ref} gate={gate} />
        )}
      </DockProvider>
    </ActiveViewContext.Provider>
  );
}
