import { ctslAircraft } from '@cpt/aircraft-ctsl';
import { demoAircraft } from '@cpt/aircraft-demo';
import type { Aircraft } from '@cpt/core';

export const aircraftRegistry: readonly Aircraft[] = [demoAircraft, ctslAircraft];
