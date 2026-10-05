import { controlWidgets, indicatorWidgets } from '@cpt/panel-kit';
import { describe, expect, it } from 'vitest';
import { aircraftRegistry } from './aircraft-registry';

const widgetIds = (definitions: readonly { readonly appearance?: object }[]): readonly string[] =>
  definitions.flatMap(({ appearance }) =>
    appearance && 'widget' in appearance ? [String(appearance.widget)] : [],
  );

describe('aircraft widgets', () => {
  it.each(aircraftRegistry.map((aircraft) => [aircraft.id, aircraft] as const))(
    '%s declares only widget ids the panel kit provides',
    (_id, aircraft) => {
      const controls = widgetIds(Object.values(aircraft.controls));
      const indicators = widgetIds(Object.values(aircraft.indicators));
      expect(controls.filter((id) => !Object.hasOwn(controlWidgets, id))).toEqual([]);
      expect(indicators.filter((id) => !Object.hasOwn(indicatorWidgets, id))).toEqual([]);
    },
  );

  it('has an aircraft that exercises every generic widget', () => {
    const covered = (ids: readonly string[], widgets: object) =>
      Object.keys(widgets).every((id) => ids.includes(id));
    const exercising = aircraftRegistry.filter(
      (aircraft) =>
        covered(widgetIds(Object.values(aircraft.controls)), controlWidgets) &&
        covered(widgetIds(Object.values(aircraft.indicators)), indicatorWidgets),
    );
    expect(exercising.map((aircraft) => aircraft.id)).not.toEqual([]);
  });
});
