import { springsBack } from '@cpt/core';
import type { ChecklistState, ControlPosition, Deviation } from '@cpt/core';
import { format, useLocalize, useMessages } from '../i18n';
import { messages as panelMessages } from '../panel/messages';
import { messages } from './messages';
import { useItemText } from './item-text';

const number = (deviation: Deviation) => ({ n: deviation.itemIndex + 1 });
const later = (deviation: Deviation) => ({ later: (deviation.laterItem ?? 0) + 1 });

/**
 * A position as a cue names it. A phrase takes its own sentence forms; `restore`, when set, is the
 * imperative to bring the control back to it.
 */
type Named = { readonly name: string; readonly phrase?: true; readonly restore?: string };

export function useDeviationText(checklist: ChecklistState<unknown> | undefined) {
  const text = useMessages(messages);
  const localize = useLocalize();
  const itemText = useItemText();
  const panelText = useMessages(panelMessages);

  const definition = (id: string | undefined) =>
    checklist && id !== undefined && Object.hasOwn(checklist.controls, id)
      ? checklist.controls[id]
      : undefined;
  // A guard item left wrong is named by its guard, such as the safety pin, not by its control.
  const guardItem = (deviation: Deviation) => {
    const found = checklist?.procedure.items[deviation.itemIndex];
    return deviation.kind === 'wrong-position' && found?.type === 'guard' ? found : undefined;
  };
  const guardName = (deviation: Deviation, at: ControlPosition | undefined): Named | undefined => {
    if (at !== 'open' && at !== 'closed') return undefined;
    const found = definition(deviation.controlId);
    const legend = found?.kind === 'guarded' ? found.guard.legends?.[at] : undefined;
    const fallback = at === 'open' ? text.guardOpen : text.guardClosed;
    return { name: legend ? localize(legend.state) : fallback, phrase: true };
  };
  const control = (deviation: Deviation) => {
    const found = definition(deviation.controlId);
    if (found?.kind === 'guarded' && guardItem(deviation)) return localize(found.guard.name);
    return found ? localize(found.name) : (deviation.controlId ?? '');
  };
  // A position reads as the panel prints it: its declared legend, else its id in capitals. A
  // position the panel prints nothing for is a phrase, which takes its own sentence forms.
  const positionName = (
    id: string | undefined,
    at: ControlPosition | undefined,
  ): Named | undefined => {
    if (at === undefined) return undefined;
    if (typeof at === 'number') return { name: `${Math.round(at * 100)} %` };
    const found = definition(id);
    if (found?.kind === 'breaker') {
      return { name: at === 'in' ? panelText.breakerIn : panelText.breakerPulled };
    }
    const legend =
      found?.legends && Object.hasOwn(found.legends, at) ? found.legends[at] : undefined;
    if (legend === undefined) return { name: at.toUpperCase() };
    if (typeof legend === 'string') return { name: legend };
    return { name: localize(legend.state), phrase: true, restore: localize(legend.restore) };
  };
  const phrased = (named: Named, legendTemplate: string, phraseTemplate: string) =>
    named.phrase ? phraseTemplate : legendTemplate;
  const position = (deviation: Deviation) =>
    guardItem(deviation)
      ? guardName(deviation, deviation.position)
      : positionName(deviation.controlId, deviation.position);
  const previous = (deviation: Deviation) => positionName(deviation.controlId, deviation.from);
  // A spring-back control is already back by the time the pilot reads this: name the press.
  const pressed = (deviation: Deviation) =>
    deviation.position !== undefined &&
    springsBack(definition(deviation.controlId), deviation.position);
  const item = (deviation: Deviation) => {
    const found = checklist?.procedure.items[deviation.itemIndex];
    return found ? itemText(found) : '';
  };
  const target = (deviation: Deviation) => {
    const found = checklist?.procedure.items[deviation.itemIndex];
    if (found?.type === 'guard') return guardName(deviation, found.position);
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
            : format(phrased(at, text.wrongPositionAtTitle, text.wrongPositionPhraseTitle), {
                control: control(deviation),
                position: at.name,
              });
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
        : format(phrased(at, text.expectedAt, text.phraseAt), {
            control: control(deviation),
            position: at.name,
          });
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
            : format(phrased(at, text.actualSet, text.phraseAt), {
                control: control(deviation),
                position: at.name,
              });
        case 'out-of-order':
          if (pressed(deviation)) {
            return format(text.actualPressedEarly, {
              control: control(deviation),
              ...later(deviation),
            });
          }
          return at === undefined
            ? format(text.outOfOrderTitle, { control: control(deviation), ...later(deviation) })
            : format(phrased(at, text.actualSetEarly, text.actualSetEarlyPhrase), {
                control: control(deviation),
                position: at.name,
                ...later(deviation),
              });
        case 'wrong-position':
          return at === undefined
            ? format(text.wrongPositionTitle, { control: control(deviation) })
            : format(phrased(at, text.wrongPositionAtTitle, text.wrongPositionPhraseTitle), {
                control: control(deviation),
                position: at.name,
              });
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
      const strayBanner = (template: string, bare: string, early: boolean) => {
        if (returned || at === undefined || from === undefined) return format(bare, stray);
        const values = { control: stray.control, position: at.name, previous: from.name };
        const set = early
          ? phrased(at, text.strayEarly, text.strayEarlyPhrase)
          : phrased(at, text.actualSet, text.phraseAt);
        return format(template, {
          ...stray,
          stray: format(set, values),
          back: from.restore ?? format(text.returnTo, values),
        });
      };
      switch (deviation.kind) {
        case 'unexpected-control':
          if (pressed(deviation)) {
            return format(flow ? text.bannerPressedFlow : text.bannerPressed, stray);
          }
          return strayBanner(
            flow ? text.bannerUnexpectedFlow : text.bannerUnexpected,
            flow ? text.bannerUnexpectedFlowBare : text.bannerUnexpectedBare,
            false,
          );
        case 'out-of-order':
          if (pressed(deviation)) {
            return format(flow ? text.bannerPressedEarlyFlow : text.bannerPressedEarly, stray);
          }
          return strayBanner(
            flow ? text.bannerOutOfOrderFlow : text.bannerOutOfOrder,
            flow ? text.bannerOutOfOrderFlowBare : text.bannerOutOfOrderBare,
            true,
          );
        case 'wrong-position':
          return at === undefined
            ? format(text.bannerWrongPosition, {
                control: control(deviation),
                ...number(deviation),
              })
            : format(phrased(at, text.bannerWrongPositionAt, text.bannerWrongPositionPhrase), {
                control: control(deviation),
                ...number(deviation),
                position: at.name,
              });
        case 'unmet-check':
          return format(text.bannerUnmet, number(deviation));
        case 'late-memory-item':
          return format(text.bannerLateMemory, number(deviation));
      }
    },
  };
}
