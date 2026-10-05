import { useEffect, useId, useState } from 'react';
import { ChecklistPane } from '../checklist/ChecklistPane';
import { useMessages } from '../i18n';
import { OutsideView } from '../outside-view/OutsideView';
import { PanelArea } from '../panel/PanelArea';
import { useSessionState, useTrainer } from '../trainer';
import { Header } from './Header';
import { useLayout } from './layout';
import { messages } from './messages';

function ChecklistToggle({
  expanded,
  controls,
  onToggle,
}: {
  expanded: boolean;
  controls: string;
  onToggle(): void;
}) {
  const text = useMessages(messages);
  const checklist = useSessionState((s) => s.checklist());
  return (
    <button
      type="button"
      className="chrome-button shell-checklist-toggle"
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onToggle}
    >
      {text.checklist}{' '}
      {checklist && (
        <span className="shell-progress">
          {checklist.completed.length} / {checklist.procedure.items.length}
        </span>
      )}
    </button>
  );
}

export function TrainerLayout() {
  const text = useMessages(messages);
  const layout = useLayout();
  const { mode, procedureId } = useTrainer();
  const [expanded, setExpanded] = useState(false);
  const paneId = useId();
  const overlay = layout === 'tablet';
  const hasChecklist = mode !== 'explore' && procedureId !== undefined;
  const showPane = hasChecklist && (!overlay || expanded);

  useEffect(() => {
    if (!overlay || !expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [overlay, expanded]);

  return (
    <div className="shell" data-layout={layout}>
      <Header
        variant="trainer"
        checklistToggle={
          overlay &&
          hasChecklist && (
            <ChecklistToggle
              expanded={expanded}
              controls={paneId}
              onToggle={() => setExpanded((open) => !open)}
            />
          )
        }
      />
      <div className="shell-body">
        <main className="shell-main">
          <section className="shell-outside-view" aria-label={text.outsideView}>
            <OutsideView />
          </section>
          <section className="shell-panel" aria-label={text.cockpitPanel}>
            <PanelArea />
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
            className="shell-checklist"
            aria-label={text.checklist}
            data-overlay={overlay}
          >
            <ChecklistPane />
          </aside>
        )}
      </div>
    </div>
  );
}
