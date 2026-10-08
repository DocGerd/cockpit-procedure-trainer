import { defineAircraft } from '@cpt/core';
import { cockpit } from './cockpit';
import { controls } from './controls';
import { devices } from './devices';
import { failures } from './failures';
import { indicators } from './indicators';
import { outsideCues } from './outside-cues';
import { phases } from './phases';
import { avionicsProcedures } from './procedures/avionics';
import { emergencyProcedures } from './procedures/emergency';
import { normalProcedures } from './procedures/normal';
import { engineRunning, initial, step } from './systems';
import { text } from './text';
import { views } from './views';

export const ctslAircraft = defineAircraft({
  id: 'ctsl',
  name: text('CT Supralight (repräsentatives Panel)', 'CT Supralight (representative panel)'),
  handbookRevision: text(
    'Flight Design CT Supralight Flug- und Wartungshandbuch AE04300003, Revision 01 (14. Jan. 2010)',
    'Flight Design CT Supralight flight and maintenance manual AE04300003, revision 01 (14 Jan 2010)',
  ),
  controls,
  indicators,
  views,
  cockpit,
  devices,
  systems: { initial, step },
  engineRunning,
  outsideCues,
  failures,
  phases,
  procedures: { ...normalProcedures, ...emergencyProcedures, ...avionicsProcedures },
});
