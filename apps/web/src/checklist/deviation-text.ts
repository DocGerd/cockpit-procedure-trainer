import { springsBack } from '@cpt/core';
import type { ChecklistState, ControlPosition, Deviation } from '@cpt/core';
import { format, useLocalize, useMessages } from '../i18n';
import { messages as panelMessages } from '../panel/messages';
import { messages } from './messages';

const number = (deviation: Deviation) => ({ n: deviation.itemIndex + 1 });
const later = (deviation: Deviation) => ({ later: (deviation.laterItem ?? 0) + 1 });

export function useDeviationText(checklist: ChecklistState<unknown> | undefined) {
  const text = useMessages(messages);
  const localize = useLocalize();
  const panelText = useMessages(panelMessages);

  const definition = (id: string | undefined) =>
    checklist && id !== undefined && Object.hasOwn(checklist.controls, id)
      ? checklist.controls[id]
      : undefined;
  const control = (deviation: Deviation) => {
    const found = definition(deviation.controlId);
    return found ? localize(found.name) : (deviation.controlId ?? '');
  };
  // A position reads as the panel prints it: its id in capitals, in the aircraft's own wording.
  const positionName = (id: string | undefined, at: ControlPosition | undefined) => {
    if (at === undefined) return undefined;
    if (typeof at === 'number') return `${Math.round(at * 100)} %`;
    if (definition(id)?.kind === 'breaker') {
      return at === 'in' ? panelText.breakerIn : panelText.breakerPulled;
    }
    return at.toUpperCase();
  };
  const position = (deviation: Deviation) => positionName(deviation.controlId, deviation.position);
  const previous = (deviation: Deviation) => positionName(deviation.controlId, deviation.from);
  // A spring-back control is already back by the time the pilot reads this: name the press.
  const pressed = (deviation: Deviation) =>
    deviation.position !== undefined &&
    springsBack(definition(deviation.controlId), deviation.position);
  const item = (deviation: Deviation) => {
    const found = checklist?.procedure.items[deviation.itemIndex];
    return found ? localize(found.text) : '';
  };
  const target = (deviation: Deviation) => {
    const found = checklist?.procedure.items[deviation.itemIndex];
    return found?.type === 'action' ? positionName(deviation.controlId, found.position) : undefined;
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
        case 'late-memory-item':
          return format(text.lateMemoryTitle, { item: item(deviation) });
      }
    },
    /** What the checklist asked for where the deviation happened. */
    expected: (deviation: Deviation) => {
      if (deviation.duringFlow) return text.expectedFlow;
      if (deviation.kind === 'late-memory-item') {
        return format(text.expectedMemory, { item: item(deviation) });
      }
      const at = deviation.kind === 'wrong-position' ? target(deviation) : undefined;
      return at === undefined
        ? item(deviation)
        : format(text.expectedAt, { control: control(deviation), position: at });
    },
    /** What the pilot did instead. */
    actual: (deviation: Deviation) => {
      const at = position(deviation);
      switch (deviation.kind) {
        case 'unexpected-control':
          if (pressed(deviation))
            return format(text.actualPressed, { control: control(deviation) });
          return at === undefined
            ? format(text.unexpectedTitle, { control: control(deviation) })
            : format(text.actualSet, { control: control(deviation), position: at });
        case 'out-of-order':
          if (pressed(deviation)) {
            return format(text.actualPressedEarly, {
              control: control(deviation),
              ...later(deviation),
            });
          }
          return at === undefined
            ? format(text.outOfOrderTitle, { control: control(deviation), ...later(deviation) })
            : format(text.actualSetEarly, {
                control: control(deviation),
                position: at,
                ...later(deviation),
              });
        case 'wrong-position':
          return at === undefined
            ? format(text.wrongPositionTitle, { control: control(deviation) })
            : format(text.wrongPositionAtTitle, { control: control(deviation), position: at });
        case 'unmet-check':
          return deviation.response === undefined
            ? text.actualUnmet
            : format(text.actualReading, { response: deviation.response });
        case 'late-memory-item':
          return text.actualLateMemory;
      }
    },
    /** The live cue; once the stray control is back, it no longer says to return it. */
    banner: (deviation: Deviation, returned = false) => {
      const at = position(deviation);
      const from = previous(deviation);
      const flow = deviation.duringFlow === true;
      const stray = {
        control: control(deviation),
        ...number(deviation),
        ...later(deviation),
      };
      const undo =
        !returned && at !== undefined && from !== undefined
          ? { ...stray, position: at, previous: from }
          : undefined;
      switch (deviation.kind) {
        case 'unexpected-control':
          if (pressed(deviation)) {
            return format(flow ? text.bannerPressedFlow : text.bannerPressed, stray);
          }
          return undo
            ? format(flow ? text.bannerUnexpectedFlow : text.bannerUnexpected, undo)
            : format(flow ? text.bannerUnexpectedFlowBare : text.bannerUnexpectedBare, stray);
        case 'out-of-order':
          if (pressed(deviation)) {
            return format(flow ? text.bannerPressedEarlyFlow : text.bannerPressedEarly, stray);
          }
          return undo
            ? format(flow ? text.bannerOutOfOrderFlow : text.bannerOutOfOrder, undo)
            : format(flow ? text.bannerOutOfOrderFlowBare : text.bannerOutOfOrderBare, stray);
        case 'wrong-position':
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
        case 'unmet-check':
          return format(text.bannerUnmet, number(deviation));
        case 'late-memory-item':
          return format(text.bannerLateMemory, number(deviation));
      }
    },
  };
}
