// @vitest-environment jsdom
import { resolveIndicator } from '@cpt/panel-kit';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aircraftRegistry } from '../aircraft-registry';
import { renderWithLanguage } from '../i18n/test-utils';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Trainer } from '../trainer';
import { PanelArea } from './PanelArea';

beforeEach(() => {
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(200);
  vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(200);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

let trainer: Trainer;
function Probe() {
  trainer = useTrainer();
  return null;
}

const ctslAircraft = aircraftRegistry.find((aircraft) => aircraft.id === 'ctsl');
if (!ctslAircraft) throw new Error('The CTSL is not registered');

const drawn = Object.entries(ctslAircraft.indicators).filter(
  ([, { appearance }]) =>
    'artwork' in appearance && ['needle', 'needles'].includes(appearance.artwork.moving.type),
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

  describe.each([
    ['cht', 'Cylinder head temperature'],
    ['oilTemperature', 'Oil temperature'],
  ] as const)('%s', (id, name) => {
    const turnedBy = (celsius: number) => {
      const indicator = ctslAircraft.indicators[id];
      if (!indicator) throw new Error(`no ${id} indicator`);
      const { widget: Gauge, options } = resolveIndicator(indicator, celsius);
      const { container } = render(
        <Gauge value={celsius} label={indicator.name.en} {...(options ? { options } : {})} />,
      );
      const face = container.querySelector('img');
      if (face) fireEvent.load(face);
      const turns = [...container.querySelectorAll('[transform^="rotate("]')].map((node) =>
        Number(/^rotate\((-?[\d.]+)/.exec(node.getAttribute('transform') ?? '')?.[1]),
      );
      return { turns, label: screen.getByRole('img').getAttribute('aria-label') };
    };

    it.each([
      [30, -111.1],
      [40, -111.1],
      [47, -111.1],
      [90, 5],
      [120, 86],
      [130, 102.5],
      [150, 135.5],
      [200, 135.5],
    ])('turns the needle at %s °C to %s degrees on the two-rate scale', (celsius, angle) => {
      const { turns } = turnedBy(celsius);
      expect(turns.length).toBeGreaterThan(0);
      for (const turn of turns) expect(turn).toBeCloseTo(angle, 6);
    });

    it.each([90, 130, 150])('names the true temperature at %s °C', (celsius) => {
      expect(turnedBy(celsius).label).toBe(`${name}: ${celsius} °C`);
    });
  });

  it.each([
    ['slipIndicator', 'Slip indicator', 'Schiebeanzeige'],
    ['hourMeter', 'Hour meter', 'Betriebsstundenzähler'],
  ] as const)('names the fixed face %s by its label alone on the rendered panel', (id, en, de) => {
    for (const [language, name] of [
      ['en', en],
      ['de', de],
    ] as const) {
      renderWithLanguage(
        <TrainerProvider>
          <Probe />
          <PanelArea />
        </TrainerProvider>,
        { language },
      );
      act(() => trainer.selectAircraft('ctsl'));
      const placed = document.querySelector(`[data-placement="${id}"]`);
      expect(placed?.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(name);
      expect(placed?.textContent).toBe('');
      cleanup();
    }
  });

  it('keeps the hour meter name the same with the engine stopped and running', () => {
    renderWithLanguage(
      <TrainerProvider>
        <Probe />
        <PanelArea />
      </TrainerProvider>,
    );
    act(() => trainer.selectAircraft('ctsl'));
    const name = () =>
      document
        .querySelector('[data-placement="hourMeter"] [role="img"]')
        ?.getAttribute('aria-label');
    expect(name()).toBe('Hour meter');
    act(() => {
      trainer.jumpToPhase('holding');
    });
    expect(name()).toBe('Hour meter');
  });
});
