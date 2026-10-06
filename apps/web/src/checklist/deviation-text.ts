import type { ChecklistState, Deviation } from '@cpt/core';
import { format, useLocalize, useMessages } from '../i18n';
import { messages } from './messages';

const number = (deviation: Deviation) => ({ n: deviation.itemIndex + 1 });

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
        deviation.kind === 'unexpected-control' ? text.duringItem : text.itemNumber,
        number(deviation),
      ),
    title: (deviation: Deviation) =>
      deviation.kind === 'unexpected-control'
        ? format(text.unexpectedTitle, { control: control(deviation) })
        : format(text.unmetTitle, { item: item(deviation) }),
    detail: (deviation: Deviation) =>
      deviation.kind === 'unexpected-control'
        ? format(text.unexpectedDetail, { item: item(deviation) })
        : text.unmetDetail,
    banner: (deviation: Deviation) =>
      deviation.kind === 'unexpected-control'
        ? format(text.bannerUnexpected, { control: control(deviation), ...number(deviation) })
        : format(text.bannerUnmet, number(deviation)),
  };
}
