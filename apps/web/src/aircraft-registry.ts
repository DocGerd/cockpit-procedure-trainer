import { demoAircraft } from '@cpt/aircraft-demo';
import type { Aircraft } from '@cpt/core';

export const aircraftRegistry: readonly Aircraft[] = [demoAircraft];
export const deviceRegistry: readonly { id: string }[] = [];
