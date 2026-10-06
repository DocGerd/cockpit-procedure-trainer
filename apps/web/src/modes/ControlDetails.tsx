import type { Aircraft, ControlDefinition, ControlKind, ControlPosition, Text } from '@cpt/core';
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { createPortal } from 'react-dom';
import { format, useLocalize, useMessages } from '../i18n';
import { useSessionState, useTrainer } from '../trainer';
import { messages } from './messages';
import { OperateToggle } from './OperateToggle';

type Messages = (typeof messages)['en'];

const USED_IN_SHOWN = 3;

const kindLabel = (text: Messages, kind: ControlKind): string =>
  ({
    toggle: text.kindToggle,
    rotary: text.kindRotary,
    lever: text.kindLever,
    momentary: text.kindMomentary,
    guarded: text.kindGuarded,
    breaker: text.kindBreaker,
  })[kind];

type Use = { readonly key: string; readonly title: Text; readonly number: number };

export function usesOf(aircraft: Pick<Aircraft, 'procedures'>, controlId: string): Use[] {
  return Object.entries(aircraft.procedures).flatMap(([procedureId, procedure]) =>
    procedure.items.flatMap((item, index) => {
      const targets =
        (item.type === 'action' && item.control === controlId) ||
        (item.type === 'check' && 'control' in item.target && item.target.control === controlId);
      return targets
        ? [{ key: `${procedureId}/${index}`, title: procedure.title, number: index + 1 }]
        : [];
    }),
  );
}

function positionLabel(text: Messages, control: ControlDefinition, position: string): string {
  if (control.kind !== 'breaker') return position;
  return position === 'in' ? text.breakerIn : text.breakerPulled;
}

function Positions({
  control,
  current,
  labelledBy,
}: {
  control: ControlDefinition;
  current: ControlPosition;
  labelledBy: string;
}) {
  const text = useMessages(messages);
  const marked = (label: string) => (
    <>
      <span className="modes-position-id">{label}</span> · {text.current}
    </>
  );
  if (control.positions === 'continuous') {
    const value = typeof current === 'number' ? Math.round(current * 100) : 0;
    return (
      <ul aria-labelledby={labelledBy} className="modes-positions">
        <li aria-current="true" className="modes-position">
          {marked(`${text.continuous} ${value} %`)}
        </li>
      </ul>
    );
  }
  return (
    <ul aria-labelledby={labelledBy} className="modes-positions">
      {control.positions.map((position) => {
        const isCurrent = position === current;
        const label = positionLabel(text, control, position);
        return (
          <li
            key={position}
            aria-current={isCurrent ? 'true' : undefined}
            className="modes-position"
          >
            {isCurrent ? marked(label) : <span className="modes-position-id">{label}</span>}
          </li>
        );
      })}
    </ul>
  );
}

type Place = { top: number; left: number };

function usePlacement(
  anchor: RefObject<HTMLElement | null>,
  popover: RefObject<HTMLElement | null>,
): Place | undefined {
  const [place, setPlace] = useState<Place>();

  useLayoutEffect(() => {
    const measure = () => {
      const target = anchor.current;
      const element = popover.current;
      if (!target || !element) return;
      const margin = parseFloat(getComputedStyle(element).marginTop) || 0;
      const around = target.getBoundingClientRect();
      const { width, height } = element.getBoundingClientRect();
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const room = (size: number, extent: number) => Math.max(0, extent - size - 2 * margin);
      const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max);
      const below = around.bottom;
      const above = around.top - height - 2 * margin;
      const fitsBelow = below <= room(height, viewport.height);
      const top = fitsBelow || above < 0 ? below : above;
      setPlace({
        top: clamp(top, room(height, viewport.height)),
        left: clamp(around.left - margin, room(width, viewport.width)),
      });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    const observer =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    if (popover.current) observer?.observe(popover.current);
    if (anchor.current) observer?.observe(anchor.current);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      observer?.disconnect();
    };
  }, [anchor, popover]);

  return place;
}

/** The details popover (S7) for a control selected in Free explore, anchored to its outline. */
export function ControlDetails({
  controlId,
  anchor,
  onClose,
}: {
  controlId: string;
  anchor: RefObject<HTMLElement | null>;
  onClose(): void;
}) {
  const text = useMessages(messages);
  const localize = useLocalize();
  const { aircraft } = useTrainer();
  const control = aircraft.controls[controlId];
  const current = useSessionState(
    (session) => session.state().controls[controlId] ?? control?.initial,
  );
  const popover = useRef<HTMLDivElement>(null);
  const place = usePlacement(anchor, popover);
  const titleId = useId();
  const positionsId = useId();
  const usedInId = useId();
  const close = useRef(onClose);
  close.current = onClose;

  const views = useMemo(
    () => Object.values(aircraft.views).filter((view) => view.controls?.[controlId] !== undefined),
    [aircraft, controlId],
  );
  const uses = useMemo(() => usesOf(aircraft, controlId), [aircraft, controlId]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !popover.current?.contains(event.target)) {
        close.current();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useEffect(() => {
    const opener = document.activeElement;
    popover.current?.focus({ preventScroll: true });
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected)
        opener.focus({ preventScroll: true });
    };
  }, [controlId]);

  if (!control || current === undefined) return null;
  const shown = uses.slice(0, USED_IN_SHOWN);
  const more = uses.length - shown.length;

  return createPortal(
    <div
      ref={popover}
      role="dialog"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="modes-details"
      style={place}
    >
      <div className="modes-details-head">
        <p className="modes-eyebrow">{text.selectedControl}</p>
        <h2 id={titleId} className="modes-details-title">
          {localize(control.name)}
        </h2>
        <div className="modes-tags">
          <span className="modes-tag modes-tag-kind">{kindLabel(text, control.kind)}</span>
          {views.map((view) => {
            const name = localize(view.name);
            return (
              <span key={name} className="modes-tag">
                {name}
              </span>
            );
          })}
        </div>
      </div>
      <div className="modes-details-body">
        <section className="modes-section">
          <h3 className="modes-eyebrow">{text.purpose}</h3>
          <p className="modes-purpose">{localize(control.description)}</p>
        </section>
        <section className="modes-section">
          <h3 id={positionsId} className="modes-eyebrow">
            {text.positions}
          </h3>
          <Positions control={control} current={current} labelledBy={positionsId} />
        </section>
        <section className="modes-section">
          <h3 id={usedInId} className="modes-eyebrow">
            {text.usedIn}
          </h3>
          {shown.length === 0 ? (
            <p className="modes-muted">{text.usedInNone}</p>
          ) : (
            <ul aria-labelledby={usedInId} className="modes-uses">
              {shown.map((use) => (
                <li key={use.key} className="modes-use">
                  <span className="modes-use-title">{localize(use.title)}</span>
                  <span className="modes-use-item">
                    {format(text.item, { number: use.number })}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {more > 0 && <p className="modes-muted">{format(text.usedInMore, { count: more })}</p>}
        </section>
      </div>
      <div className="modes-details-foot">
        <OperateToggle hint />
      </div>
    </div>,
    document.body,
  );
}
