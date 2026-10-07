import { useId } from 'react';
import type { LampColour } from '../indicators/options';

export type Material =
  | 'metal-light'
  | 'metal-shade'
  | 'bezel'
  | 'bezel-dark'
  | 'dial'
  | 'shadow'
  | 'glare'
  | 'plastic'
  | 'plastic-light'
  | 'plastic-shade'
  | 'screw'
  | 'screw-light'
  | 'screw-shade'
  | `lamp-${LampColour}`
  | `lamp-glow-${LampColour}`;

export type Stop = readonly [offset: number, token: Material, opacity?: number];
export type Point = readonly [x: number, y: number];

/** A paint-server id unique to one widget instance, usable inside `url(#…)`. */
export function useMaterialId(kind: string): string {
  return `pk-${kind}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

export const paint = (id: string, material: string) => `url(#${id}-${material})`;

function Stops({ stops }: { stops: readonly Stop[] }) {
  return stops.map(([offset, token, opacity]) => (
    <stop
      key={offset}
      offset={offset}
      style={{ stopColor: `var(--panel-${token})` }}
      {...(opacity === undefined ? {} : { stopOpacity: opacity })}
    />
  ));
}

export function LinearGradient({
  id,
  stops,
  from,
  to,
}: {
  id: string;
  stops: readonly Stop[];
  from: Point;
  to: Point;
}) {
  return (
    <linearGradient id={id} x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]}>
      <Stops stops={stops} />
    </linearGradient>
  );
}

/** Centre and radius are fractions of the shape's box, or user units with `userSpace`. */
export function RadialGradient({
  id,
  stops,
  centre,
  radius,
  userSpace = false,
}: {
  id: string;
  stops: readonly Stop[];
  centre: Point;
  radius: number;
  userSpace?: boolean;
}) {
  return (
    <radialGradient
      id={id}
      {...(userSpace ? { gradientUnits: 'userSpaceOnUse' } : {})}
      cx={centre[0]}
      cy={centre[1]}
      r={radius}
    >
      <Stops stops={stops} />
    </radialGradient>
  );
}

/**
 * Stops for the art-direction brief's materials, lit from the upper left. Linear ones run along
 * `LIGHT` from its lit end; reversed ones (an inner lip) run against it.
 */
export const LIGHT = { from: [0.15, 0.08], to: [0.85, 0.95] } as const;
export const GLARE_SWEEP = { from: [0.15, 0], to: [0.6, 1] } as const;

export const finish = {
  bezel: [
    [0, 'metal-light'],
    [0.35, 'bezel'],
    [0.7, 'bezel-dark'],
    [1, 'metal-shade'],
  ],
  lip: [
    [0, 'bezel'],
    [0.45, 'bezel-dark'],
    [1, 'metal-shade'],
  ],
  plastic: [
    [0, 'plastic-light'],
    [0.4, 'plastic'],
    [1, 'plastic-shade'],
  ],
  specular: [
    [0, 'glare', 0.65],
    [1, 'glare', 0],
  ],
  glare: [
    [0, 'glare', 0.28],
    [0.55, 'glare', 0.07],
    [1, 'glare', 0],
  ],
  recess: [
    [0.84, 'shadow', 0],
    [0.93, 'shadow', 0.3],
    [1, 'shadow', 0.75],
  ],
  cap: [
    [0, 'metal-light'],
    [0.6, 'bezel-dark'],
    [1, 'metal-shade'],
  ],
  screw: [
    [0, 'screw-light'],
    [0.55, 'screw'],
    [1, 'screw-shade'],
  ],
} as const satisfies Record<string, readonly Stop[]>;

/** A lit lamp: a hot core in its glow token, falling off through the lamp colour to nothing. */
export const lampGlow = (colour: LampColour): readonly Stop[] => [
  [0, `lamp-glow-${colour}`],
  [0.45, `lamp-${colour}`],
  [1, `lamp-${colour}`, 0],
];

/** The highlight of a domed or turned top face sits up-left of its centre. */
export const DOME = { centre: [0.38, 0.34], radius: 0.7 } as const;

/**
 * A fine speckle for printed dials and painted plates: a `<pattern>` tile of light and dark dots
 * at low opacity, cheaper than a turbulence filter.
 */
export function Grain({
  id,
  tile,
  opacity = 0.06,
}: {
  id: string;
  tile: number;
  opacity?: number;
}) {
  const dot = tile / 8;
  return (
    <pattern id={id} width={tile} height={tile} patternUnits="userSpaceOnUse">
      {(
        [
          [0.2, 0.3, 'glare'],
          [0.7, 0.15, 'shadow'],
          [0.55, 0.65, 'glare'],
          [0.1, 0.85, 'shadow'],
          [0.85, 0.8, 'glare'],
        ] as const
      ).map(([x, y, token]) => (
        <circle
          key={`${x}-${y}`}
          cx={x * tile}
          cy={y * tile}
          r={dot}
          opacity={opacity}
          style={{ fill: `var(--panel-${token})` }}
        />
      ))}
    </pattern>
  );
}

/** The metal and glass every round instrument shares; `recess` is the dial opening in user units. */
export function Materials({
  id,
  recess,
}: {
  id: string;
  recess: { centre: Point; radius: number };
}) {
  return (
    <defs>
      <LinearGradient id={`${id}-bezel`} {...LIGHT} stops={finish.bezel} />
      <LinearGradient id={`${id}-lip`} from={LIGHT.to} to={LIGHT.from} stops={finish.lip} />
      <LinearGradient id={`${id}-glare`} {...GLARE_SWEEP} stops={finish.glare} />
      <RadialGradient id={`${id}-recess`} userSpace {...recess} stops={finish.recess} />
      <RadialGradient id={`${id}-cap`} {...DOME} stops={finish.cap} />
    </defs>
  );
}
