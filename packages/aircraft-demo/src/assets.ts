export const images = {
  panel: new URL('./assets/view-panel.svg', import.meta.url).href,
  console: new URL('./assets/view-console.svg', import.meta.url).href,
  avionics: new URL('./assets/view-avionics.svg', import.meta.url).href,
  parking: new URL('./assets/phase-parking.svg', import.meta.url).href,
  holding: new URL('./assets/phase-holding.svg', import.meta.url).href,
  linedUp: new URL('./assets/phase-lined-up.svg', import.meta.url).href,
  departure: new URL('./assets/phase-departure.svg', import.meta.url).href,
  cruise: new URL('./assets/phase-cruise.svg', import.meta.url).href,
  approach: new URL('./assets/phase-approach.svg', import.meta.url).href,
  landing: new URL('./assets/phase-landing.svg', import.meta.url).href,
  taxiIn: new URL('./assets/phase-taxi-in.svg', import.meta.url).href,
  parkingSecuring: new URL('./assets/phase-parking-securing.svg', import.meta.url).href,
} as const;
