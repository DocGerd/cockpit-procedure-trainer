import type { ProcedureItem } from '@cpt/core';
import { useCallback } from 'react';
import { format, useLocalize, useMessages } from '../i18n';
import { messages } from './messages';

/** An item's text, with a check's expected value after its challenge unless `reveal` is false. */
export function useItemText() {
  const text = useMessages(messages);
  const localize = useLocalize();
  return useCallback(
    (item: ProcedureItem<unknown>, reveal = true) =>
      item.type === 'check' && item.expected !== undefined && reveal
        ? format(text.checkExpected, {
            challenge: localize(item.text),
            expected: localize(item.expected),
          })
        : localize(item.text),
    [text, localize],
  );
}
