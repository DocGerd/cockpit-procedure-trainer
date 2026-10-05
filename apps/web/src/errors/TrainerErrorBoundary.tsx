import { Component, useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { useMessages } from '../i18n';
import { useSessionState, useTrainer } from '../trainer';
import { messages } from './messages';
import './errors.css';

function ErrorDialog({ onReset }: { onReset(): void }) {
  const text = useMessages(messages);
  const titleId = useId();
  const bodyId = useId();
  const reset = useRef<HTMLButtonElement>(null);
  useEffect(() => reset.current?.focus(), []);
  return (
    <div className="error-backdrop">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="error-dialog"
      >
        <h1 id={titleId} className="error-title">
          {text.errorTitle}
        </h1>
        <p id={bodyId} className="error-body">
          {text.errorBody}
        </p>
        <button ref={reset} type="button" className="button-primary" onClick={onReset}>
          {text.reset}
        </button>
      </div>
    </div>
  );
}

function SessionFailure() {
  const text = useMessages(messages);
  const { resetSession } = useTrainer();
  const status = useSessionState((snapshot) => snapshot.status());
  if (status.kind !== 'failed') return null;
  const detail = status.error instanceof Error ? status.error.message : undefined;
  return (
    <div role="alert" className="session-failure">
      <div className="session-failure-text">
        <div className="session-failure-title">{text.sessionFailedTitle}</div>
        <div className="session-failure-body">{text.sessionFailedBody}</div>
        {detail && <code className="session-failure-detail">{detail}</code>}
      </div>
      <button type="button" className="button-primary" onClick={resetSession}>
        {text.reset}
      </button>
    </div>
  );
}

type BoundaryProps = { children: ReactNode; onReset(): void };
type BoundaryState = { failed: boolean };

class Boundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  private readonly reset = () => {
    this.props.onReset();
    this.setState({ failed: false });
  };

  override render() {
    return this.state.failed ? <ErrorDialog onReset={this.reset} /> : this.props.children;
  }
}

export function TrainerErrorBoundary({ children }: { children: ReactNode }) {
  const { resetSession } = useTrainer();
  return (
    <Boundary onReset={resetSession}>
      <SessionFailure />
      {children}
    </Boundary>
  );
}
