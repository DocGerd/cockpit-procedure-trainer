import type { ControlDefinition, Placement, Text } from '@cpt/core';

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

const lettered = (lines: readonly string[] | undefined) =>
  lines !== undefined && lines.some((line) => line.trim() !== '');

const translated = (text: Text | undefined) =>
  text !== undefined && text.de.trim() !== '' && text.en.trim() !== '';

function missing(control: ControlDefinition, placement: Placement): string | undefined {
  if (lettered(placement.printed)) return undefined;
  const { appearance } = control;
  if (appearance && 'artwork' in appearance) {
    return lettered(appearance.artwork.lettering)
      ? undefined
      : 'prints no label: declare the lettering its artwork or view prints';
  }
  return translated(control.placard) ? undefined : 'prints no label: declare a placard';
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
