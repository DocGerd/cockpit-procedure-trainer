import { defineMessages } from '../i18n';

export const messages = defineMessages({
  en: {
    noScreen: 'No screen for {device}',
    dock: 'Device dock',
    dockHint: 'Select a device on the panel to operate it here.',
    dockClose: 'Close device',
    dockCloseLabel: 'Close',
  },
  de: {
    noScreen: 'Kein Bildschirm für {device}',
    dock: 'Gerätedock',
    dockHint: 'Ein Gerät am Panel wählen, um es hier zu bedienen.',
    dockClose: 'Gerät schließen',
    dockCloseLabel: 'Schließen',
  },
});

/** The unit's name as the pilot says it, keyed by device id; a device without one is named by its id. */
export const unitNames = defineMessages({
  en: {
    flarm: 'FLARM',
    com: 'COM radio',
    atr833: 'COM radio',
    transponder: 'Transponder',
    trt800h: 'Transponder',
    aera500: 'GPS',
  },
  de: {
    flarm: 'FLARM',
    com: 'COM-Funkgerät',
    atr833: 'COM-Funkgerät',
    transponder: 'Transponder',
    trt800h: 'Transponder',
    aera500: 'GPS',
  },
});
