import { defineAircraft } from '@cpt/core';
import { controls } from './controls';
import { devices } from './devices';
import { failures } from './failures';
import { indicators } from './indicators';
import { phases } from './phases';
import { avionicsProcedures } from './procedures/avionics';
import { emergencyProcedures } from './procedures/emergency';
import { normalProcedures } from './procedures/normal';
import { initial, step } from './systems';
import { text } from './text';
import { views } from './views';

export const ctslAircraft = defineAircraft({
  id: 'ctsl',
  name: text('CT Supralight (repräsentatives Panel)', 'CT Supralight (representative panel)'),
  handbookRevision:
    'Flight Design CT Supralight flight and maintenance manual AE04300003, revision 01 (14 Jan 2010)',
  controls,
  indicators,
  views,
  devices,
  systems: { initial, step },
  failures,
  phases,
  procedures: { ...normalProcedures, ...emergencyProcedures, ...avionicsProcedures },
});
