import { defineMessages } from '../i18n';

export const messages = defineMessages({
  en: {
    phase: 'Start in phase',
    jumpTitle: 'Jump to {phase}?',
    jumpBody: 'Jumping to {phase} ends the running procedure and loads that phase.',
    jumpConfirm: 'Jump to phase',
    jumpCancel: 'Cancel',
  },
  de: {
    phase: 'Start in Flugphase',
    jumpTitle: 'Sprung zu {phase}?',
    jumpBody: 'Der Sprung zu {phase} beendet das laufende Verfahren und lädt diese Phase.',
    jumpConfirm: 'Zur Phase springen',
    jumpCancel: 'Abbrechen',
  },
});
