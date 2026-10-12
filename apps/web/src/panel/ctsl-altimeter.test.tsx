// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithLanguage } from '../i18n/test-utils';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Trainer } from '../trainer';
import { PanelArea } from './PanelArea';

let trainer: Trainer;
function Probe() {
  trainer = useTrainer();
  return null;
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(200);
  vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(200);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderCtsl() {
  renderWithLanguage(
    <TrainerProvider>
      <Probe />
      <PanelArea />
    </TrainerProvider>,
  );
  act(() => trainer.selectAircraft('ctsl'));
  for (const image of document.querySelectorAll('[data-placement="altimeter"] img')) {
    fireEvent.load(image);
  }
}

const windowText = () =>
  document.querySelector('[data-placement="altimeter"] [data-window="setting"]')?.textContent;
const handAngles = () =>
  [...document.querySelectorAll('[data-placement="altimeter"] svg[data-moving] > image')].map(
    (hand) => Number(/^rotate\(([-\d.]+)/.exec(hand.getAttribute('transform') ?? '')?.[1]),
  );

describe('the CTSL altimeter on the panel', () => {
  it('shows the knob setting in its window and turns all three hands with the knob', () => {
    renderCtsl();
    expect(windowText()).toBe('1025');
    // 315 ft field elevation, 12 hPa above QNH at 27 ft each.
    const before = 315 + 12 * 27;
    expect(handAngles()).toEqual([before * 0.0036, before * 0.036, before * 0.36].map(round));

    act(() => {
      trainer.session.set('altimeterSetting', '1013');
    });
    expect(windowText()).toBe('1013');
    expect(handAngles()).toEqual([315 * 0.0036, 315 * 0.036, 315 * 0.36].map(round));
  });

  it('places the setting knob as an operable slider beside the altimeter', () => {
    renderCtsl();
    const knob = document.querySelector('[data-placement="altimeterSetting"]');
    expect(knob?.getAttribute('data-kind')).toBe('control');
    expect(screen.getByRole('slider', { name: 'Altimeter setting knob' })).toBeTruthy();
  });
});

function round(value: number) {
  return Math.round(value * 1e9) / 1e9;
}
