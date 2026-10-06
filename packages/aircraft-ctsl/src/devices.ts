import type { DeviceInstall } from '@cpt/core';
import type { CtslState } from './systems';
import type { ViewId } from './views';

export const devices = {} as const satisfies Record<string, DeviceInstall<CtslState, ViewId>>;
