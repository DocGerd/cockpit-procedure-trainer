import type { DeviceInstall } from '@cpt/core';
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
    inputs: {},
  },
} as const satisfies Record<string, DeviceInstall<CtslState, ViewId>>;
