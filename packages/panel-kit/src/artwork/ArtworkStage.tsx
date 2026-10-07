// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./css.d.ts" />
import type { ArtworkAppearance, MovingPart } from '@cpt/core';
import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import './artwork.css';
import { layerFraction, needleAngle, pointAlong } from './geometry';
import type { LayerValue } from './geometry';

export type Artwork = ArtworkAppearance['artwork'];
export type Size = { width: number; height: number };

type StageProps = {
  artwork: Artwork;
  value: LayerValue;
  notches?: readonly string[] | undefined;
  fallback: ReactNode;
  imageLabel?: string | undefined;
  renderInput?: ((size: Size | null) => ReactNode) | undefined;
};

const stageStyle: CSSProperties = { position: 'relative', width: '100%' };
const faceStyle: CSSProperties = { display: 'block', width: '100%', height: 'auto' };
const overlayStyle: CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
};

function movingSource(moving: MovingPart, value: LayerValue): string | undefined {
  return moving.type === 'positions' ? moving.images[String(value)] : moving.image;
}

// The needle image is drawn at 0 degrees, as authored, and rotated clockwise by the absolute angle.
function movingTransform(
  moving: MovingPart,
  value: LayerValue,
  notches: readonly string[] | undefined,
): string | undefined {
  const fraction = layerFraction(value, notches);
  if (moving.type === 'needle') {
    return `rotate(${needleAngle(moving, fraction)} ${moving.pivot.x} ${moving.pivot.y})`;
  }
  if (moving.type === 'travel') {
    const first = moving.path[0];
    const at = pointAlong(moving.path, fraction);
    return first ? `translate(${at.x - first.x} ${at.y - first.y})` : undefined;
  }
  return undefined;
}

export function ArtworkStage({
  artwork,
  value,
  notches,
  fallback,
  imageLabel,
  renderInput,
}: StageProps) {
  const [size, setSize] = useState<Size | null>(null);
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const { face, moving } = artwork;
  const source = movingSource(moving, value);
  if (source === undefined || failed.has(face) || failed.has(source)) return <>{fallback}</>;

  const fail = (url: string) => setFailed((previous) => new Set(previous).add(url));
  const transform = movingTransform(moving, value, notches);

  return (
    <div
      style={stageStyle}
      {...(imageLabel === undefined ? {} : { role: 'img', 'aria-label': imageLabel })}
    >
      <img
        src={face}
        alt=""
        draggable={false}
        style={faceStyle}
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget;
          if (naturalWidth > 0 && naturalHeight > 0) {
            setSize({ width: naturalWidth, height: naturalHeight });
          }
        }}
        onError={() => fail(face)}
      />
      {size && (
        <svg
          viewBox={`0 0 ${size.width} ${size.height}`}
          aria-hidden="true"
          focusable="false"
          className="cpt-artwork-moving"
          data-moving={moving.type}
          style={overlayStyle}
        >
          <image
            href={source}
            width={size.width}
            height={size.height}
            preserveAspectRatio="none"
            transform={transform}
            onError={() => fail(source)}
          />
        </svg>
      )}
      {renderInput?.(size)}
    </div>
  );
}
