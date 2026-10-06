import type { ControlDefinition, Placement } from '@cpt/core';

export type PlacardFinding = {
  readonly view: string;
  readonly id: string;
  readonly message: string;
};

export type PlacardSubject = {
  readonly controls: Readonly<Record<string, ControlDefinition>>;
  readonly views: Readonly<
    Record<string, { readonly controls?: Readonly<Record<string, Placement | undefined>> }>
  >;
};

const POSITION_WORDS = [
  'ON',
  'OFF',
  'OPEN',
  'SHUT',
  'CLOSED',
  'PUSH',
  'PULL',
  'IN',
  'OUT',
  'UP',
  'DN',
  'DOWN',
  'L',
  'R',
  'BOTH',
  'START',
];

/** True when the lines hold any visible text; the panel and the check share this rule. */
export const printsText = (lines: readonly string[] | undefined): boolean =>
  lines !== undefined && lines.some((line) => line.trim() !== '');

function namesFunction(control: ControlDefinition, lines: readonly string[]): boolean {
  const positions = control.positions === 'continuous' ? [] : control.positions;
  const legends = new Set([...POSITION_WORDS, ...positions.map((id) => id.toUpperCase())]);
  return lines.some((line) => line.trim() !== '' && !legends.has(line.trim().toUpperCase()));
}

function missing(control: ControlDefinition, placement: Placement): string | undefined {
  const { appearance } = control;
  const [lines, source] = printsText(placement.printed)
    ? [placement.printed ?? [], 'printed by its view']
    : appearance && 'artwork' in appearance
      ? [appearance.artwork.lettering ?? [], 'lettered on its artwork']
      : [control.placard === undefined ? [] : [control.placard], 'its placard'];
  if (!printsText(lines)) {
    return appearance && 'artwork' in appearance
      ? 'prints no label: declare the lettering its artwork or view prints'
      : 'prints no label: declare a placard';
  }
  return namesFunction(control, lines)
    ? undefined
    : `names no function: ${source} shows only position legends`;
}

/** Every control a view places must print its function on the panel. */
export function checkPlacards(subject: PlacardSubject): readonly PlacardFinding[] {
  return Object.entries(subject.views).flatMap(([view, { controls = {} }]) =>
    Object.entries(controls).flatMap(([id, placement]) => {
      const control = subject.controls[id];
      if (!control || !placement) return [];
      const message = missing(control, placement);
      return message ? [{ view, id, message }] : [];
    }),
  );
}
