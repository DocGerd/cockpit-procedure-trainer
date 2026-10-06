import type { ControlDefinition, IndicatorDefinition, JsonObject } from '@cpt/core';
import { resolveControl, resolveIndicator } from '@cpt/panel-kit';
import { useMemo } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { useLocalize, useMessages } from '../i18n';
import { useExploreStore } from '../modes/explore-state';
import { usePanelInput } from '../modes/panel-input';
import { useSessionState, useTrainer } from '../trainer';
import { messages } from './messages';
import type { PanelBox } from './rects';
import { useGatedInput } from './touch-gate';

const boxStyle = (box: PanelBox): CSSProperties => ({
  left: `${box.left}%`,
  top: `${box.top}%`,
  width: `${box.width}%`,
  height: `${box.height}%`,
});

function Placement({
  id,
  kind,
  box,
  children,
  onKeyDown,
}: {
  id: string;
  kind: 'control' | 'indicator';
  box: PanelBox;
  children: ReactNode;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className="panel-placement"
      data-placement={id}
      data-kind={kind}
      style={boxStyle(box)}
      {...(onKeyDown ? { onKeyDown } : {})}
    >
      {children}
    </div>
  );
}

const noLabels: Readonly<Record<string, string>> = {};

export function ControlPlacement({
  id,
  control,
  box,
}: {
  id: string;
  control: ControlDefinition;
  box: PanelBox;
}) {
  const text = useMessages(messages);
  const localize = useLocalize();
  const position = useSessionState((s) => s.state().controls[id] ?? control.initial);
  const guardOpen = useSessionState((s) => s.guards()[id] === 'open');
  const input = useGatedInput(id, usePanelInput(id));
  const { mode } = useTrainer();
  const explore = useExploreStore();
  const { widget: Widget, options } = resolveControl(control);
  const positionLabels = useMemo(
    () =>
      control.kind === 'breaker' ? { in: text.breakerIn, pulled: text.breakerPulled } : noLabels,
    [control.kind, text],
  );

  return (
    <Placement
      id={id}
      kind="control"
      box={box}
      onKeyDown={(event) => {
        // Every widget, a lever too, opens its details on Enter while Free explore only selects.
        if (event.key === 'Enter' && mode === 'explore' && !explore.get().operate) {
          explore.select(id);
        }
      }}
    >
      <Widget
        control={control}
        position={position}
        guardOpen={guardOpen}
        label={localize(control.name)}
        positionLabels={positionLabels}
        {...(options ? { options } : {})}
        {...input}
      />
    </Placement>
  );
}

export function IndicatorPlacement({
  id,
  indicator,
  box,
}: {
  id: string;
  indicator: IndicatorDefinition<unknown>;
  box: PanelBox;
}) {
  const text = useMessages(messages);
  const localize = useLocalize();
  const value = useSessionState((s) => indicator.select(s.state()));
  const { widget: Widget, options: declared } = resolveIndicator(indicator, value);
  const lamp = typeof value === 'boolean';
  const options = useMemo((): JsonObject | undefined => {
    if (!lamp || declared?.stateLabels !== undefined) return declared;
    return { ...declared, stateLabels: { lit: text.lampLit, dark: text.lampDark } };
  }, [lamp, declared, text]);

  return (
    <Placement id={id} kind="indicator" box={box}>
      <Widget value={value} label={localize(indicator.name)} {...(options ? { options } : {})} />
    </Placement>
  );
}
