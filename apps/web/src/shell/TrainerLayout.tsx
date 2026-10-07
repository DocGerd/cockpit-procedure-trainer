import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';
import { ChecklistAnnouncer } from '../checklist/ChecklistAnnouncer';
import { ChecklistPane } from '../checklist/ChecklistPane';
import { format, useMessages } from '../i18n';
import { OutsideView } from '../outside-view/OutsideView';
import { PanelArea } from '../panel/PanelArea';
import { useCockpitLayout, useCockpitRegion } from '../panel/use-cockpit-layout';
import { useSessionState, useTrainer } from '../trainer';
import { AppFooter } from './AppFooter';
import { Header } from './Header';
import { useLayout } from './layout';
import { messages } from './messages';

const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

const focusLost = () => {
  const focused = document.activeElement;
  return !focused || focused === document.body || !focused.isConnected;
};

function ChecklistToggle({
  expanded,
  controls,
  buttonRef,
  onToggle,
}: {
  expanded: boolean;
  controls: string;
  buttonRef: RefObject<HTMLButtonElement | null>;
  onToggle(): void;
}) {
  const text = useMessages(messages);
  const { mode } = useTrainer();
  const checklist = useSessionState((s) => s.checklist());
  const deviations = mode === 'guided' ? (checklist?.deviations.length ?? 0) : 0;
  const progress = checklist
    ? `${checklist.completed.length} / ${checklist.procedure.items.length}`
    : undefined;
  const label =
    deviations > 0
      ? format(deviations === 1 ? text.toggleDeviationOne : text.toggleDeviationOther, {
          count: deviations,
        })
      : undefined;
  return (
    <button
      ref={buttonRef}
      type="button"
      className="chrome-button shell-checklist-toggle"
      aria-label={label && `${text.checklist} ${progress}, ${label}`}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onToggle}
    >
      {text.checklist} {progress && <span className="shell-progress">{progress}</span>}
      {deviations > 0 && (
        <span className="shell-deviation-badge" aria-hidden="true">
          {deviations}
        </span>
      )}
    </button>
  );
}

export function TrainerLayout() {
  const text = useMessages(messages);
  const layout = useLayout();
  const { aircraft, procedureId, viewedProcedureId } = useTrainer();
  const [expanded, setExpanded] = useState(false);
  const paneId = useId();
  const overlay = layout === 'tablet';
  const done = useSessionState((snapshot) => snapshot.checklist()?.done ?? false);
  const current = useSessionState((snapshot) => snapshot.checklist()?.current);
  const pane = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const openedByToggle = useRef(false);
  const shell = useRef<HTMLDivElement>(null);
  const section = useRef<HTMLElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const cockpit = useCockpitLayout(aircraft, useCockpitRegion(shell, section), frame);
  const showPane = !overlay || expanded;

  useEffect(() => {
    if (done) setExpanded(true);
  }, [done]);

  useEffect(() => {
    const aside = pane.current;
    const item = aside?.querySelector('[aria-current="step"]');
    if (!aside || !item) return;
    const box = aside.getBoundingClientRect();
    const rect = item.getBoundingClientRect();
    if (rect.top < box.top) aside.scrollTop -= box.top - rect.top;
    else if (rect.bottom > box.bottom) aside.scrollTop += rect.bottom - box.bottom;
  }, [current, showPane, viewedProcedureId]);

  useEffect(() => {
    if (!overlay || !expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [overlay, expanded]);

  useEffect(() => {
    if (!expanded || !openedByToggle.current) return;
    openedByToggle.current = false;
    pane.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }, [expanded]);

  // A collapsed pane takes its focus with it, as does a procedure start; the toggle leads back to it.
  useEffect(() => {
    if (overlay && !expanded && focusLost()) toggle.current?.focus();
  }, [overlay, expanded, procedureId]);

  // The open drawer covers the panel, so Tab leaves it for the toggle instead of the panel behind.
  const onPaneKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (!overlay || event.key !== 'Tab') return;
    const focusable = [...(pane.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    const edge = event.shiftKey ? focusable[0] : focusable.at(-1);
    if (edge === undefined || document.activeElement !== edge) return;
    event.preventDefault();
    toggle.current?.focus();
  };

  return (
    <div
      ref={shell}
      className="shell"
      data-layout={layout}
      data-cockpit-layout={cockpit.kind}
      data-screen="trainer"
    >
      <Header
        variant="trainer"
        checklistToggle={
          overlay && (
            <ChecklistToggle
              expanded={expanded}
              controls={paneId}
              buttonRef={toggle}
              onToggle={() => {
                openedByToggle.current = !expanded;
                setExpanded(!expanded);
              }}
            />
          )
        }
      />
      <div className="shell-body">
        <main className="shell-main">
          <section className="shell-outside-view" aria-label={text.outsideView}>
            <OutsideView />
          </section>
          <section ref={section} className="shell-panel" aria-label={text.cockpitPanel}>
            <PanelArea layout={cockpit} frame={frame} />
          </section>
        </main>
        {showPane && overlay && (
          <div
            className="shell-scrim"
            data-testid="checklist-scrim"
            aria-hidden="true"
            onClick={() => setExpanded(false)}
          />
        )}
        {showPane && (
          <aside
            id={paneId}
            ref={pane}
            className="shell-checklist"
            aria-label={text.checklist}
            data-overlay={overlay}
            onKeyDown={onPaneKeyDown}
          >
            <ChecklistPane />
          </aside>
        )}
      </div>
      <AppFooter />
      <ChecklistAnnouncer announceDeviations={overlay && !expanded} />
    </div>
  );
}
