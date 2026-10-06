import type { IndicatorValue, JsonObject } from '@cpt/core';
import type { ReactNode } from 'react';
import { formatNumber } from '../indicators/geometry';
import { readAnnunciatorOptions, readReadoutOptions } from '../indicators/options';
import type { IndicatorWidgetProps } from '../types';
import { ArtworkStage } from './ArtworkStage';
import type { Artwork } from './ArtworkStage';

export type ArtworkIndicatorProps = IndicatorWidgetProps & {
  artwork: Artwork;
  fallback: ReactNode;
};

function nameOf(label: string, value: IndicatorValue, options: JsonObject | undefined): string {
  if (typeof value === 'boolean') {
    const labels = readAnnunciatorOptions(options)?.stateLabels;
    return labels ? `${label}: ${value ? labels.lit : labels.dark}` : label;
  }
  if (typeof value !== 'number') return `${label}: ${String(value)}`;
  const readout = readReadoutOptions(options);
  const text = readout?.decimals == null ? formatNumber(value) : value.toFixed(readout.decimals);
  return readout?.units ? `${label}: ${text} ${readout.units}` : `${label}: ${text}`;
}

export function ArtworkIndicator({
  value,
  label,
  options,
  artwork,
  fallback,
}: ArtworkIndicatorProps) {
  return (
    <ArtworkStage
      artwork={artwork}
      value={value}
      fallback={fallback}
      imageLabel={nameOf(label, value, options)}
    />
  );
}
