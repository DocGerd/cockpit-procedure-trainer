// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { act, cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { aircraftRegistry } from '../aircraft-registry';
import { renderWithLanguage } from '../i18n/test-utils';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Trainer } from '../trainer';
import { OutsideView } from './OutsideView';

const read = (aircraftId: string, url: string) =>
  readFileSync(
    join(
      import.meta.dirname,
      '../../../../packages',
      `aircraft-${aircraftId}/src/assets`,
      basename(url),
    ),
    'utf8',
  );
const hasBlade = (svg: string) => svg.includes('Q931 90');
const hasDisc = (svg: string) => /<circle [^>]*r="150"/.test(svg);

let trainer: Trainer;
function Probe() {
  trainer = useTrainer();
  return null;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(cleanup);

describe.each(aircraftRegistry.map((aircraft) => [aircraft.id, aircraft] as const))(
  'propeller in the outside view of %s',
  (id, aircraft) => {
    const phases = Object.entries(aircraft.phases);

    it.each(phases)('draws the blade stopped and the disc running in %s', (_phase, definition) => {
      expect(definition.imageRunning).toBeTypeOf('string');
      const stopped = read(id, definition.image);
      const running = read(id, definition.imageRunning ?? '');
      expect(hasBlade(stopped)).toBe(true);
      expect(hasDisc(stopped)).toBe(false);
      expect(hasDisc(running)).toBe(true);
      expect(hasBlade(running)).toBe(false);
    });

    it('shows the disc image in exactly the phases that start with the engine running', () => {
      localStorage.setItem('cpt.aircraft', id);
      renderWithLanguage(
        <TrainerProvider>
          <Probe />
          <OutsideView />
        </TrainerProvider>,
      );
      expect(trainer.aircraft.id).toBe(id);
      const shown = phases.map(([phaseId, definition]) => {
        act(() => trainer.session.jumpToPhase(phaseId));
        const running = aircraft.engineRunning?.(trainer.session.state()) === true;
        const src = screen.getByRole('img').getAttribute('src');
        expect(src).toBe(running ? definition.imageRunning : definition.image);
        return running;
      });
      expect(shown).toContain(true);
      expect(shown).toContain(false);
    });
  },
);
