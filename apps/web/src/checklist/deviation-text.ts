import type { ChecklistState, Deviation } from '@cpt/core';
import { format, useLocalize, useMessages } from '../i18n';
import { messages as panelMessages } from '../panel/messages';
import { messages } from './messages';

const number = (deviation: Deviation) => ({ n: deviation.itemIndex + 1 });
const later = (deviation: Deviation) => ({ later: (deviation.laterItem ?? 0) + 1 });

export function useDeviationText(checklist: ChecklistState<unknown> | undefined) {
  const text = useMessages(messages);
  const localize = useLocalize();
  const panelText = useMessages(panelMessages);

  const definition = (deviation: Deviation) => {
    const id = deviation.controlId ?? '';
    return checklist && Object.hasOwn(checklist.controls, id) ? checklist.controls[id] : undefined;
  };
  const control = (deviation: Deviation) => {
    const found = definition(deviation);
    return found ? localize(found.name) : (deviation.controlId ?? '');
  };
  // Only breakers have position names in the UI language; other position ids are not shown.
  const position = (deviation: Deviation) => {
    if (definition(deviation)?.kind !== 'breaker') return undefined;
    return deviation.position === 'in' ? panelText.breakerIn : panelText.breakerPulled;
  };
  const item = (deviation: Deviation) => {
    const found = checklist?.procedure.items[deviation.itemIndex];
    return found ? localize(found.text) : '';
  };

  return {
    where: (deviation: Deviation) =>
      deviation.duringFlow
        ? text.duringFlow
        : format(
            deviation.kind === 'unexpected-control' || deviation.kind === 'out-of-order'
              ? text.duringItem
              : text.itemNumber,
            number(deviation),
          ),
    title: (deviation: Deviation) => {
      switch (deviation.kind) {
        case 'unexpected-control':
          return format(text.unexpectedTitle, { control: control(deviation) });
        case 'out-of-order':
          return format(text.outOfOrderTitle, { control: control(deviation), ...later(deviation) });
        case 'wrong-position': {
          const at = position(deviation);
          return at === undefined
            ? format(text.wrongPositionTitle, { control: control(deviation) })
            : format(text.wrongPositionAtTitle, { control: control(deviation), position: at });
        }
        case 'unmet-check':
          return format(text.unmetTitle, { item: item(deviation) });
      }
    },
    detail: (deviation: Deviation) => {
      switch (deviation.kind) {
        case 'unexpected-control':
        case 'out-of-order':
          return deviation.duringFlow
            ? text.flowDetail
            : format(text.unexpectedDetail, { item: item(deviation) });
        case 'wrong-position':
          return format(text.wrongPositionDetail, { item: item(deviation) });
        case 'unmet-check':
          return deviation.response === undefined
            ? text.unmetDetail
            : format(text.unmetReadingDetail, { response: deviation.response });
      }
    },
    banner: (deviation: Deviation) => {
      switch (deviation.kind) {
        case 'unexpected-control':
          return format(deviation.duringFlow ? text.bannerUnexpectedFlow : text.bannerUnexpected, {
            control: control(deviation),
            ...number(deviation),
          });
        case 'out-of-order':
          return format(deviation.duringFlow ? text.bannerOutOfOrderFlow : text.bannerOutOfOrder, {
            control: control(deviation),
            ...number(deviation),
            ...later(deviation),
          });
        case 'wrong-position': {
          const at = position(deviation);
          return at === undefined
            ? format(text.bannerWrongPosition, {
                control: control(deviation),
                ...number(deviation),
              })
            : format(text.bannerWrongPositionAt, {
                control: control(deviation),
                ...number(deviation),
                position: at,
              });
        }
        case 'unmet-check':
          return format(text.bannerUnmet, number(deviation));
      }
    },
  };
}
