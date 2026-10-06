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
} as const satisfies Record<string, DeviceInstall<CtslState, ViewId>>;
