import { defineMessages } from '../i18n';

export const messages = defineMessages({
  en: {
    lostProgress: 'Progress lost: {done} of {total} items done',
    lostDeviationOne: '{count} deviation',
    lostDeviationOther: '{count} deviations',
    lostFlight: 'The full flight ends after {legs} of {total} legs.',
  },
  de: {
    lostProgress: 'Verlorener Fortschritt: {done} von {total} Punkten erledigt',
    lostDeviationOne: '{count} Abweichung',
    lostDeviationOther: '{count} Abweichungen',
    lostFlight: 'Der ganze Flug endet nach {legs} von {total} Abschnitten.',
  },
});
