export const images = {
  panel: new URL('./assets/view-panel.svg', import.meta.url).href,
  console: new URL('./assets/view-console.svg', import.meta.url).href,
  avionics: new URL('./assets/view-avionics.svg', import.meta.url).href,
  parking: new URL('./assets/phase-parking.svg', import.meta.url).href,
  holding: new URL('./assets/phase-holding.svg', import.meta.url).href,
  departure: new URL('./assets/phase-departure.svg', import.meta.url).href,
  cruise: new URL('./assets/phase-cruise.svg', import.meta.url).href,
} as const;
