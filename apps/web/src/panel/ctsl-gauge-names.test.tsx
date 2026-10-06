// @vitest-environment jsdom
import { resolveIndicator } from '@cpt/panel-kit';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { aircraftRegistry } from '../aircraft-registry';

afterEach(cleanup);

const ctslAircraft = aircraftRegistry.find((aircraft) => aircraft.id === 'ctsl');
if (!ctslAircraft) throw new Error('The CTSL is not registered');

const drawn = Object.entries(ctslAircraft.indicators).filter(
  ([, indicator]) => 'artwork' in indicator.appearance,
);

describe('CTSL drawn gauges', () => {
  it('draws the round gauges as artwork', () => {
    expect(drawn.map(([id]) => id).sort()).toEqual([
      'airspeed',
      'altimeter',
      'cht',
      'oilPressure',
      'oilTemperature',
      'tachometer',
      'verticalSpeed',
    ]);
  });

  it.each(
    drawn.flatMap(([id, indicator]) =>
      (['en', 'de'] as const).map((lang) => [id, lang, indicator] as const),
    ),
  )(
    '%s keeps its full %s name as the accessible name and prints no caption',
    (_id, lang, indicator) => {
      const name = indicator.name[lang];
      const { widget: Gauge } = resolveIndicator(indicator, 0);
      const { container } = render(<Gauge value={0} label={name} />);
      expect(screen.getByRole('img', { name: new RegExp(`^${name}`) })).toBeTruthy();
      expect(container.textContent).toBe('');
    },
  );
});
