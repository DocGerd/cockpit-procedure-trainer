import type { IndicatorValue } from '@cpt/core';
import type { IndicatorWidget } from '../types';
import { Annunciator } from './Annunciator';
import { DigitalReadout } from './DigitalReadout';
import { RoundGauge } from './RoundGauge';

export const indicatorWidgets: Readonly<Record<string, IndicatorWidget>> = {
  'round-gauge': RoundGauge,
  annunciator: Annunciator,
  'digital-readout': DigitalReadout,
};

export function defaultIndicatorWidget(value: IndicatorValue): IndicatorWidget {
  if (typeof value === 'number') return RoundGauge;
  if (typeof value === 'boolean') return Annunciator;
  return DigitalReadout;
}
