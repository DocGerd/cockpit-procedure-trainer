import type { DeviceInstall } from '@cpt/core';
import { KMH_PER_KT, pressureAltitudeFt } from './systems';
import type { CtslState, CtslTrainerState } from './systems';
import { deviceSlots } from './views';
import type { ViewId } from './views';

const avionicsOn =
  (breaker: string) =>
  (state: CtslTrainerState): boolean =>
    state.systems.bus.avionicsPowered && state.controls[breaker] === 'in';

export const devices = {
  com: {
    device: 'atr833',
    view: 'panel',
    placement: deviceSlots.com,
    powered: avionicsOn('comBreaker'),
    inputs: {},
  },
  xpdr: {
    device: 'trt800h',
    view: 'panel',
    placement: deviceSlots.xpdr,
    powered: avionicsOn('xpdrBreaker'),
    inputs: {
      pressureAltitude: (state) =>
        pressureAltitudeFt(state.systems.altitudeFt, state.systems.qnhHpa),
    },
  },
  gps: {
    device: 'aera500',
    view: 'panel',
    placement: deviceSlots.gps,
    powered: avionicsOn('gpsBreaker'),
    // No wind speed is modelled, so the ground speed is the airspeed and the track the heading.
    inputs: {
      groundSpeedKt: (state) => state.systems.airspeedKmh / KMH_PER_KT,
      trackDeg: (state) => state.systems.headingDeg,
      altitudeFt: (state) => state.systems.altitudeFt,
    },
  },
  // No breaker of its own: the avionics master switches it (intake §3.6, §9 question 33).
  flarm: {
    device: 'flarm',
    view: 'panel',
    placement: deviceSlots.flarm,
    powered: (state) => state.systems.bus.avionicsPowered,
    inputs: { supplyVolts: (state) => state.systems.bus.volts },
  },
} as const satisfies Record<string, DeviceInstall<CtslState, ViewId>>;
