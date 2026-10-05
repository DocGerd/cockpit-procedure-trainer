import type { ReactNode } from 'react';
import type { IndicatorWidgetProps } from '../types';
import { ArtworkStage } from './ArtworkStage';
import type { Artwork } from './ArtworkStage';

export type ArtworkIndicatorProps = IndicatorWidgetProps & {
  artwork: Artwork;
  fallback: ReactNode;
};

export function ArtworkIndicator({ value, label, artwork, fallback }: ArtworkIndicatorProps) {
  return <ArtworkStage artwork={artwork} value={value} fallback={fallback} imageLabel={label} />;
}
