import { defineMessages } from '../i18n';

export const messages = defineMessages({
  en: {
    errorTitle: 'Something went wrong',
    errorBody: 'The trainer hit an unexpected error. Resetting starts the session again.',
    reset: 'Reset',
    sessionFailedTitle: 'The simulation stopped',
    sessionFailedBody:
      'An aircraft system failed, so the panel no longer responds. Reset to start the session again.',
    noticeTitle: 'Training aid only',
    noticeBody: "The aircraft's handbook is authoritative. Do not use this app in flight.",
  },
  de: {
    errorTitle: 'Etwas ist schiefgelaufen',
    errorBody:
      'Der Trainer ist auf einen unerwarteten Fehler gestoßen. Mit dem Zurücksetzen beginnt die Sitzung neu.',
    reset: 'Zurücksetzen',
    sessionFailedTitle: 'Die Simulation wurde angehalten',
    sessionFailedBody:
      'Ein Flugzeugsystem ist ausgefallen, deshalb reagiert die Tafel nicht mehr. Zum Neustart der Sitzung zurücksetzen.',
    noticeTitle: 'Nur zur Ausbildung',
    noticeBody: 'Maßgeblich ist das Handbuch des Flugzeugs. Diese App nicht im Flug verwenden.',
  },
});
