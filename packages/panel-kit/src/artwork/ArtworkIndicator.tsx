import type { IndicatorValue, JsonObject } from '@cpt/core';
import type { ReactNode } from 'react';
import { formatNumber } from '../indicators/geometry';
import type { IndicatorWidgetProps } from '../types';
import { ArtworkStage } from './ArtworkStage';
import type { Artwork } from './ArtworkStage';

export type ArtworkIndicatorProps = IndicatorWidgetProps & {
  artwork: Artwork;
  fallback: ReactNode;
};

function stateLabel(options: JsonObject | undefined, lit: boolean): string | undefined {
  const labels = options?.stateLabels;
  if (typeof labels !== 'object' || labels === null || Array.isArray(labels)) return undefined;
  const label = lit ? labels.lit : labels.dark;
  return typeof label === 'string' ? label : undefined;
}

function nameOf(label: string, value: IndicatorValue, options: JsonObject | undefined): string {
  if (typeof value === 'boolean') {
    const state = stateLabel(options, value);
    return state === undefined ? label : `${label}: ${state}`;
  }
  if (typeof value !== 'number') return `${label}: ${String(value)}`;
  const units = typeof options?.units === 'string' ? options.units : '';
  return units === ''
    ? `${label}: ${formatNumber(value)}`
    : `${label}: ${formatNumber(value)} ${units}`;
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
