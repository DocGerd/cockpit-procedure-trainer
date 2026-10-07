import { Fragment } from 'react';
import type { ReactNode } from 'react';
import {
  DOME,
  finish,
  GLARE_SWEEP,
  LIGHT,
  LinearGradient,
  paint,
  RadialGradient,
} from './Materials';
import type { Point } from './Materials';

const ACROSS = { from: [0, 0], to: [1, 0] } as const;
const DOWN = { from: [0, 0], to: [0, 1] } as const;
const AGAINST = { from: LIGHT.to, to: LIGHT.from } as const;

const kit = {
  bezel: (id: string) => <LinearGradient id={id} {...LIGHT} stops={finish.bezel} />,
  lip: (id: string) => <LinearGradient id={id} {...AGAINST} stops={finish.lip} />,
  plate: (id: string) => <LinearGradient id={id} {...LIGHT} stops={finish.plate} />,
  plastic: (id: string) => <LinearGradient id={id} {...LIGHT} stops={finish.plastic} />,
  dome: (id: string) => <RadialGradient id={id} {...DOME} stops={finish.dome} />,
  cap: (id: string) => <RadialGradient id={id} {...DOME} stops={finish.cap} />,
  screw: (id: string) => <RadialGradient id={id} {...DOME} stops={finish.screw} />,
  ridge: (id: string) => <LinearGradient id={id} {...ACROSS} stops={finish.ridge} />,
  'ridge-across': (id: string) => <LinearGradient id={id} {...DOWN} stops={finish.ridge} />,
  chrome: (id: string) => <LinearGradient id={id} {...ACROSS} stops={finish.chrome} />,
  'chrome-across': (id: string) => <LinearGradient id={id} {...DOWN} stops={finish.chrome} />,
  'chrome-dome': (id: string) => <RadialGradient id={id} {...DOME} stops={finish['chrome-dome']} />,
  band: (id: string) => <LinearGradient id={id} {...ACROSS} stops={finish.band} />,
  well: (id: string) => <LinearGradient id={id} {...LIGHT} stops={finish.well} />,
  specular: (id: string) => <LinearGradient id={id} {...LIGHT} stops={finish.specular} />,
  glare: (id: string) => <LinearGradient id={id} {...GLARE_SWEEP} stops={finish.glare} />,
  'screen-glare': (id: string) => (
    <LinearGradient id={id} {...GLARE_SWEEP} stops={finish.screenGlare} />
  ),
} as const;

export type KitMaterial = keyof typeof kit;

/** The paint servers a widget instance uses, each referenced as `paint(id, material)`. */
export function Kit({
  id,
  use,
  children,
}: {
  id: string;
  use: readonly KitMaterial[];
  children?: ReactNode;
}) {
  return (
    <defs>
      {use.map((material) => (
        <Fragment key={material}>{kit[material](`${id}-${material}`)}</Fragment>
      ))}
      {children}
    </defs>
  );
}

type Box = { x: number; y: number; width: number; height: number; rx: number };

/**
 * A soft cast shadow without a blur filter: three translucent copies of the outline, stepped out
 * by `blur`, so their sum falls off towards the edge.
 */
export function SoftShadow({
  box,
  offset,
  blur,
  opacity = 0.6,
}: {
  box: Box;
  offset: Point;
  blur: number;
  opacity?: number;
}) {
  const layer = 1 - (1 - opacity) ** (1 / 3);
  return (
    <g opacity={layer} style={{ fill: 'var(--panel-shadow)' }}>
      {[blur / 2, 0, -blur / 2].map((grow) => (
        <rect
          key={grow}
          x={box.x + offset[0] - grow}
          y={box.y + offset[1] - grow}
          width={Math.max(0, box.width + 2 * grow)}
          height={Math.max(0, box.height + 2 * grow)}
          rx={Math.max(0, box.rx + grow)}
        />
      ))}
    </g>
  );
}

export const circleBox = (cx: number, cy: number, r: number): Box => ({
  x: cx - r,
  y: cy - r,
  width: 2 * r,
  height: 2 * r,
  rx: r,
});

/** A slotted black-oxide screw head with its short shadow straight down; needs `screw` in the kit. */
export function Screw({
  id,
  cx,
  cy,
  r,
  angle,
}: {
  id: string;
  cx: number;
  cy: number;
  r: number;
  angle: number;
}) {
  return (
    <g>
      <circle
        cx={cx}
        cy={cy + r * 0.3}
        r={r}
        opacity={0.45}
        style={{ fill: 'var(--panel-shadow)' }}
      />
      <circle cx={cx} cy={cy} r={r} style={{ fill: paint(id, 'screw') }} />
      <line
        x1={cx - r * 0.75}
        y1={cy}
        x2={cx + r * 0.75}
        y2={cy}
        transform={`rotate(${angle} ${cx} ${cy})`}
        strokeWidth={r * 0.32}
        strokeLinecap="round"
        style={{ stroke: 'var(--panel-screw-shade)' }}
      />
    </g>
  );
}

/** A knurled ring: one dashed circle, its dashes the ridges between `inner` and `outer`. */
export function Knurl({
  cx,
  cy,
  inner,
  outer,
  ridges,
  width,
  token,
  opacity = 1,
}: {
  cx: number;
  cy: number;
  inner: number;
  outer: number;
  ridges: number;
  width: number;
  token: 'metal-shade' | 'plastic-shade';
  opacity?: number;
}) {
  const r = (inner + outer) / 2;
  const pitch = (2 * Math.PI * r) / ridges;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill="none"
      strokeWidth={outer - inner}
      strokeDasharray={`${width} ${pitch - width}`}
      opacity={opacity}
      style={{ stroke: `var(--panel-${token})` }}
    />
  );
}
