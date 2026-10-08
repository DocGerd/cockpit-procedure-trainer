import { defineMessages } from '../i18n';

export const messages = defineMessages({
  en: {
    noScreen: 'No screen for {device}',
    dock: 'Device dock',
    dockHint: 'Select a device on the panel to operate it here.',
    dockClose: 'Close device',
  },
  de: {
    noScreen: 'Kein Bildschirm für {device}',
    dock: 'Gerätedock',
    dockHint: 'Ein Gerät am Panel wählen, um es hier zu bedienen.',
    dockClose: 'Gerät schließen',
  },
});

/** The unit's name as the pilot says it, keyed by device id; a device without one is named by its id. */
export const unitNames = defineMessages({
  en: {
    com: 'COM radio',
    sl40: 'COM radio',
    transponder: 'Transponder',
    gtx327: 'Transponder',
    gpsmap496: 'GPS',
  },
  de: {
    com: 'COM-Funkgerät',
    sl40: 'COM-Funkgerät',
    transponder: 'Transponder',
    gtx327: 'Transponder',
    gpsmap496: 'GPS',
  },
});
