// @vitest-environment jsdom
import { resolveIndicator } from '@cpt/panel-kit';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aircraftRegistry } from '../aircraft-registry';

beforeEach(() => {
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(200);
  vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(200);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const ctslAircraft = aircraftRegistry.find((aircraft) => aircraft.id === 'ctsl');
if (!ctslAircraft) throw new Error('The CTSL is not registered');

const drawn = Object.entries(ctslAircraft.indicators).filter(
  ([, { appearance }]) => 'artwork' in appearance && appearance.artwork.moving.type === 'needle',
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
      'voltmeter',
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
      const { widget: Gauge, options } = resolveIndicator(indicator, 0);
      const { container } = render(
        <Gauge value={0} label={name} {...(options ? { options } : {})} />,
      );
      expect(
        screen.getByRole('img', { name: new RegExp(`^${name}: -?[\\d.]+ \\S+$`) }),
      ).toBeTruthy();
      expect(container.textContent).toBe('');
    },
  );

  it.each([
    ['voltmeter', 0, -124],
    ['voltmeter', 9, -124],
    ['voltmeter', 13, 0],
    ['voltmeter', 20, 124],
    ['oilPressure', 0, -124],
    ['oilPressure', 7, 44],
    ['oilPressure', 9, 44],
  ] as const)(
    '%s at %f turns its needle to %f degrees, held at the ends of its scale',
    (id, value, angle) => {
      const indicator = ctslAircraft.indicators[id];
      if (!indicator) throw new Error(`no ${id} indicator`);
      const { widget: Gauge, options } = resolveIndicator(indicator, value);
      const { container } = render(
        <Gauge value={value} label={indicator.name.en} {...(options ? { options } : {})} />,
      );
      const face = container.querySelector('img');
      if (face) fireEvent.load(face);
      const turns = [...container.innerHTML.matchAll(/rotate\((-?[\d.]+) 100 100\)/g)].map(
        ([, deg]) => Number(deg),
      );
      expect(turns).toContain(angle);
    },
  );

  it('reads the airspeed with its unit', () => {
    const airspeed = ctslAircraft.indicators.airspeed;
    if (!airspeed) throw new Error('no airspeed indicator');
    const { widget: Gauge, options } = resolveIndicator(airspeed, 200.02);
    render(<Gauge value={200.02} label={airspeed.name.en} {...(options ? { options } : {})} />);
    expect(screen.getByRole('img', { name: 'Airspeed indicator: 200 km/h' })).toBeTruthy();
  });
});
