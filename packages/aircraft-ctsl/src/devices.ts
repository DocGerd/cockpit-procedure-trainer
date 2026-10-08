import type { DeviceInstall } from '@cpt/core';
import { KMH_PER_KT } from './systems';
import type { CtslState, CtslTrainerState } from './systems';
import { deviceSlots } from './views';
import type { ViewId } from './views';

const avionicsOn =
  (breaker: string) =>
  (state: CtslTrainerState): boolean =>
    state.systems.bus.avionicsPowered && state.controls[breaker] === 'in';

export const devices = {
  com: {
    device: 'sl40',
    view: 'panel',
    placement: deviceSlots.com,
    powered: avionicsOn('comBreaker'),
    inputs: {},
  },
  xpdr: {
    device: 'gtx327',
    view: 'panel',
    placement: deviceSlots.xpdr,
    powered: avionicsOn('xpdrBreaker'),
    inputs: { pressureAltitude: (state) => state.systems.altitudeFt },
  },
  gps: {
    device: 'gpsmap496',
    view: 'panel',
    placement: deviceSlots.gps,
    powered: avionicsOn('gpsBreaker'),
    // No wind speed is modelled, so the ground speed is the airspeed and the track the heading.
    inputs: {
      groundSpeedKt: (state) => state.systems.airspeedKmh / KMH_PER_KT,
      trackDeg: (state) => state.systems.headingDeg,
    },
  },
} as const satisfies Record<string, DeviceInstall<CtslState, ViewId>>;
