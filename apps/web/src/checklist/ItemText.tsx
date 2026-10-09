import type { ProcedureItem } from '@cpt/core';
import { useLocalize } from '../i18n';
import { useItemText } from './item-text';

/**
 * An item's text, a check's expected value set as challenge, dot leader, RESPONSE. The text
 * content stays the same as `useItemText`, so it reads and searches as one phrase.
 */
export function ItemText({
  item,
  reveal = true,
}: {
  item: ProcedureItem<unknown>;
  reveal?: boolean;
}) {
  const localize = useLocalize();
  const itemText = useItemText();
  if (item.type !== 'check' || item.expected === undefined || !reveal) {
    return itemText(item, reveal);
  }
  const challenge = localize(item.text);
  const whole = itemText(item);
  const expected = localize(item.expected);
  if (!whole.startsWith(challenge) || !whole.endsWith(expected)) return whole;
  const separator = whole.slice(challenge.length, whole.length - expected.length);
  return (
    <>
      <span className="checklist-challenge">{challenge}</span>
      <span className="checklist-sr">{separator}</span>
      <span className="leader" aria-hidden="true" />
      <span className="checklist-expected">{expected}</span>
    </>
  );
}
