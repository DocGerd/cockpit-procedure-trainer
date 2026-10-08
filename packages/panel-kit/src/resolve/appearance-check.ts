import type {
  Appearance,
  ControlDefinition,
  ControlKind,
  IndicatorValue,
  JsonObject,
} from '@cpt/core';
import { readHitAreas } from '../artwork/geometry';
import { controlWidgets } from '../controls';
import { indicatorWidgets } from '../indicators';
import {
  readAnnunciatorOptions,
  readGaugeOptions,
  readReadoutOptions,
} from '../indicators/options';

export type AppearanceFinding = {
  readonly subject: 'control' | 'indicator';
  readonly id: string;
  readonly message: string;
};

export type AppearanceSubject = {
  readonly controls: Readonly<Record<string, ControlDefinition>>;
  readonly indicators: Readonly<Record<string, { readonly appearance: Appearance }>>;
};

type ValueType = 'number' | 'boolean' | 'string';

export const controlWidgetKinds: Readonly<Record<string, readonly ControlKind[]>> = {
  toggle: ['toggle', 'rotary'],
  rocker: ['toggle', 'rotary'],
  'key-switch': ['toggle', 'rotary'],
  'rotary-knob': ['toggle', 'rotary'],
  lever: ['lever'],
  'push-button': ['momentary'],
  'guarded-handle': ['guarded'],
  'circuit-breaker': ['breaker'],
};

export const indicatorWidgetFit: Readonly<
  Record<
    string,
    {
      readonly values: readonly ValueType[];
      readonly readOptions: (options: JsonObject | undefined) => unknown;
    }
  >
> = {
  'round-gauge': { values: ['number'], readOptions: readGaugeOptions },
  annunciator: { values: ['boolean'], readOptions: readAnnunciatorOptions },
  'digital-readout': {
    values: ['number', 'boolean', 'string'],
    readOptions: readReadoutOptions,
  },
};

const list = (items: readonly string[]) => items.map((item) => `"${item}"`).join(', ');

const typeOf = (value: IndicatorValue): ValueType =>
  typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'string';

function checkControl(id: string, control: ControlDefinition): AppearanceFinding | undefined {
  const { appearance } = control;
  if (!appearance) return undefined;
  const finding = (message: string): AppearanceFinding => ({ subject: 'control', id, message });
  if (!('widget' in appearance)) {
    const openImages = appearance.artwork.guardOpen;
    if (openImages !== undefined) {
      if (control.kind !== 'guarded') {
        return finding(`open-guard images need a guarded control, not a ${control.kind} one`);
      }
      const owned: readonly unknown[] = control.positions;
      const stray = Object.keys(openImages).filter((position) => !owned.includes(position));
      if (stray.length > 0) {
        return finding(
          `the open-guard images name positions the control does not have: ${list(stray)}`,
        );
      }
    }
    const areas = readHitAreas(appearance.options);
    if (areas === null) {
      return finding(`the hitArea option is invalid: ${JSON.stringify(appearance.options)}`);
    }
    const positions: readonly unknown[] = Array.isArray(control.positions) ? control.positions : [];
    const unknown = Object.keys(areas).filter((position) => !positions.includes(position));
    return unknown.length > 0
      ? finding(`the hitArea option names positions the control does not have: ${list(unknown)}`)
      : undefined;
  }
  const { widget } = appearance;
  if (!Object.hasOwn(controlWidgets, widget)) {
    return finding(
      `unknown widget "${widget}"; the panel kit has ${list(Object.keys(controlWidgets))}`,
    );
  }
  const kinds = controlWidgetKinds[widget] ?? [];
  if (!kinds.includes(control.kind)) {
    return finding(
      `widget "${widget}" does not fit a ${control.kind} control; it fits ${list(kinds)} controls`,
    );
  }
  return undefined;
}

function checkIndicator(
  id: string,
  appearance: Appearance,
  values: readonly IndicatorValue[],
): AppearanceFinding | undefined {
  if (!('widget' in appearance)) return undefined;
  const finding = (message: string): AppearanceFinding => ({ subject: 'indicator', id, message });
  const { widget, options } = appearance;
  if (!Object.hasOwn(indicatorWidgets, widget)) {
    return finding(
      `unknown widget "${widget}"; the panel kit has ${list(Object.keys(indicatorWidgets))}`,
    );
  }
  const fit = indicatorWidgetFit[widget];
  if (!fit) return undefined;
  const misfit = [...new Set(values.map(typeOf))].filter((type) => !fit.values.includes(type));
  if (misfit.length > 0) {
    return finding(
      `widget "${widget}" shows ${fit.values.join(' or ')} values, but this indicator yields ${misfit.join(' and ')}`,
    );
  }
  if (fit.readOptions(options) === null) {
    return finding(
      `options for widget "${widget}" are invalid, so the panel would show a placeholder: ${JSON.stringify(options ?? {})}`,
    );
  }
  return undefined;
}

export function checkAppearance(
  subject: AppearanceSubject,
  indicatorValues: Readonly<Record<string, readonly IndicatorValue[]>> = {},
): readonly AppearanceFinding[] {
  const controls = Object.entries(subject.controls).map(([id, control]) =>
    checkControl(id, control),
  );
  const indicators = Object.entries(subject.indicators).map(([id, { appearance }]) =>
    checkIndicator(id, appearance, indicatorValues[id] ?? []),
  );
  return [...controls, ...indicators].filter((finding) => finding !== undefined);
}
