import { useMessages } from '../i18n';
import { useExploreState, useExploreStore } from './explore-state';
import { messages } from './messages';

export function OperateToggle({ hint = false }: { hint?: boolean }) {
  const text = useMessages(messages);
  const store = useExploreStore();
  const { operate } = useExploreState();
  return (
    <label className="modes-operate">
      <span className="modes-operate-text">
        <span className="modes-operate-label">{text.operate}</span>
        {hint && <span className="modes-operate-hint">{text.operateHint}</span>}
      </span>
      <input
        type="checkbox"
        className="modes-operate-input"
        checked={operate}
        onChange={(event) => store.setOperate(event.target.checked)}
      />
    </label>
  );
}
