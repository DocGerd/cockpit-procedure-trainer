import type {
  Appearance,
  ControlDefinition,
  IndicatorValue,
  JsonObject,
  WidgetAppearance,
} from '@cpt/core';
import { createElement } from 'react';
import { ArtworkControl, ArtworkIndicator } from '../artwork';
import type { Artwork } from '../artwork';
import { controlWidgets, defaultControlWidget } from '../controls';
import { defaultIndicatorWidget, indicatorWidgets } from '../indicators';
import type { ControlWidget, IndicatorWidget } from '../types';

export type Resolved<W> = { readonly widget: W; readonly options: JsonObject | undefined };

const declared = <W>(
  registry: Readonly<Record<string, W>>,
  appearance: WidgetAppearance,
): Resolved<W> | undefined =>
  Object.hasOwn(registry, appearance.widget)
    ? { widget: registry[appearance.widget] as W, options: appearance.options }
    : undefined;

// Cached per definition, so a re-render keeps the same component and never remounts it.
const artworkControls = new WeakMap<ControlDefinition, ControlWidget>();
const artworkIndicators = new WeakMap<Appearance, IndicatorWidget>();

function artworkControl(control: ControlDefinition, artwork: Artwork): ControlWidget {
  const cached = artworkControls.get(control);
  if (cached) return cached;
  const Fallback = defaultControlWidget(control.kind);
  const widget: ControlWidget = (props) =>
    createElement(ArtworkControl, {
      ...props,
      artwork,
      fallback: createElement(Fallback, props),
    });
  artworkControls.set(control, widget);
  return widget;
}

function artworkIndicator(appearance: Appearance, artwork: Artwork): IndicatorWidget {
  const cached = artworkIndicators.get(appearance);
  if (cached) return cached;
  const widget: IndicatorWidget = (props) =>
    createElement(ArtworkIndicator, {
      ...props,
      artwork,
      fallback: createElement(defaultIndicatorWidget(props.value), props),
    });
  artworkIndicators.set(appearance, widget);
  return widget;
}

export function resolveControl(control: ControlDefinition): Resolved<ControlWidget> {
  const { appearance } = control;
  if (appearance && 'artwork' in appearance) {
    return { widget: artworkControl(control, appearance.artwork), options: undefined };
  }
  return (
    (appearance && declared(controlWidgets, appearance)) ?? {
      widget: defaultControlWidget(control.kind),
      options: undefined,
    }
  );
}

export function resolveIndicator(
  indicator: { readonly appearance: Appearance },
  value: IndicatorValue,
): Resolved<IndicatorWidget> {
  const { appearance } = indicator;
  if ('artwork' in appearance) {
    return { widget: artworkIndicator(appearance, appearance.artwork), options: undefined };
  }
  return (
    declared(indicatorWidgets, appearance) ?? {
      widget: defaultIndicatorWidget(value),
      options: undefined,
    }
  );
}

export const resolveControlWidget = (control: ControlDefinition): ControlWidget =>
  resolveControl(control).widget;

export const resolveIndicatorWidget = (
  indicator: { readonly appearance: Appearance },
  value: IndicatorValue,
): IndicatorWidget => resolveIndicator(indicator, value).widget;

export { checkAppearance } from './appearance-check';
export type { AppearanceFinding, AppearanceSubject } from './appearance-check';
