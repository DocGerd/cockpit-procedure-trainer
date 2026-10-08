import { defineMessages } from '../i18n';

export const messages = defineMessages({
  en: {
    lostProgress: 'Progress lost: {done} of {total} items done',
    lostDeviationOne: '{count} deviation',
    lostDeviationOther: '{count} deviations',
    nothingLost: 'No items are done yet, so no progress is lost.',
  },
  de: {
    lostProgress: 'Verlorener Fortschritt: {done} von {total} Punkten erledigt',
    lostDeviationOne: '{count} Abweichung',
    lostDeviationOther: '{count} Abweichungen',
    nothingLost: 'Noch kein Punkt erledigt, es geht also kein Fortschritt verloren.',
  },
});
