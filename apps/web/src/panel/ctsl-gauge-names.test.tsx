// @vitest-environment jsdom
import { resolveIndicator } from '@cpt/panel-kit';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { aircraftRegistry } from '../aircraft-registry';
import { renderWithLanguage } from '../i18n/test-utils';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Trainer } from '../trainer';
import { PanelArea } from './PanelArea';

afterEach(cleanup);

let trainer: Trainer;
function Probe() {
  trainer = useTrainer();
  return null;
}

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

  it('reads the airspeed with its unit', () => {
    const airspeed = ctslAircraft.indicators.airspeed;
    if (!airspeed) throw new Error('no airspeed indicator');
    const { widget: Gauge, options } = resolveIndicator(airspeed, 200.02);
    render(<Gauge value={200.02} label={airspeed.name.en} {...(options ? { options } : {})} />);
    expect(screen.getByRole('img', { name: 'Airspeed indicator: 200 km/h' })).toBeTruthy();
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
