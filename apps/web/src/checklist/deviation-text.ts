import type { ChecklistState, Deviation } from '@cpt/core';
import { format, useLocalize, useMessages } from '../i18n';
import { messages } from './messages';

const number = (deviation: Deviation) => ({ n: deviation.itemIndex + 1 });
const later = (deviation: Deviation) => ({ later: (deviation.laterItem ?? 0) + 1 });
const position = (deviation: Deviation) => ({ position: String(deviation.position ?? '') });

export function useDeviationText(checklist: ChecklistState<unknown> | undefined) {
  const text = useMessages(messages);
  const localize = useLocalize();

  const control = (deviation: Deviation) => {
    const id = deviation.controlId ?? '';
    const definition =
      checklist && Object.hasOwn(checklist.controls, id) ? checklist.controls[id] : undefined;
    return definition ? localize(definition.name) : id;
  };
  const item = (deviation: Deviation) => {
    const found = checklist?.procedure.items[deviation.itemIndex];
    return found ? localize(found.text) : '';
  };

  return {
    where: (deviation: Deviation) =>
      format(
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
        case 'wrong-position':
          return format(text.wrongPositionTitle, {
            control: control(deviation),
            ...position(deviation),
          });
        case 'unmet-check':
          return format(text.unmetTitle, { item: item(deviation) });
      }
    },
    detail: (deviation: Deviation) => {
      switch (deviation.kind) {
        case 'unexpected-control':
        case 'out-of-order':
          return format(text.unexpectedDetail, { item: item(deviation) });
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
          return format(text.bannerUnexpected, {
            control: control(deviation),
            ...number(deviation),
          });
        case 'out-of-order':
          return format(text.bannerOutOfOrder, {
            control: control(deviation),
            ...number(deviation),
            ...later(deviation),
          });
        case 'wrong-position':
          return format(text.bannerWrongPosition, {
            control: control(deviation),
            ...number(deviation),
            ...position(deviation),
          });
        case 'unmet-check':
          return format(text.bannerUnmet, number(deviation));
      }
    },
  };
}
