import { deviceControls } from '@cpt/core';
import type { ChecklistState, Deviation } from '@cpt/core';
import { useMemo } from 'react';
import { deviceRegistry } from '../device-registry';
import { format, useLocalize, useMessages } from '../i18n';
import { useTrainer } from '../trainer';
import { messages } from './messages';

const number = (deviation: Deviation) => ({ n: deviation.itemIndex + 1 });

export function useDeviationText(checklist: ChecklistState<unknown>) {
  const text = useMessages(messages);
  const localize = useLocalize();
  const { aircraft } = useTrainer();

  const controls = useMemo(
    () => ({ ...aircraft.controls, ...deviceControls(aircraft, deviceRegistry) }),
    [aircraft],
  );

  const control = (deviation: Deviation) => {
    const id = deviation.controlId ?? '';
    const definition = Object.hasOwn(controls, id) ? controls[id] : undefined;
    return definition ? localize(definition.name) : id;
  };
  const item = (deviation: Deviation) => {
    const found = checklist.procedure.items[deviation.itemIndex];
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
