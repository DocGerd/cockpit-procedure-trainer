// @vitest-environment jsdom
import type { Aircraft } from '@cpt/core';
import { cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithLanguage } from '../i18n/test-utils';
import { TrainerProvider } from '../trainer';
import { PanelArea } from './PanelArea';

vi.mock('../aircraft-registry', async (importOriginal) => {
  const { aircraftRegistry } = await importOriginal<{ aircraftRegistry: readonly Aircraft[] }>();
  const demo = aircraftRegistry.find((aircraft) => aircraft.id === 'demo');
  const panel = demo?.views['panel'];
  const at = (id: string) => {
    const placement = panel?.controls?.[id];
    if (!demo || !panel || !placement) throw new Error(`the demo panel does not place ${id}`);
    return placement;
  };
  return {
    aircraftRegistry: [
      {
        ...demo,
        views: {
          ...demo?.views,
          panel: {
            ...panel,
            controls: {
              ...panel?.controls,
              battery: { ...at('battery'), printed: [' '] },
              alternator: { ...at('alternator'), printed: ['ALT'] },
            },
          },
        },
      },
    ],
  };
});

afterEach(cleanup);

const placardOf = (id: string) =>
  document.querySelector(`[data-placement="${id}"] [data-placard]`)?.textContent;

it('prints the widget placard unless the view prints visible text for the control', () => {
  renderWithLanguage(
    <TrainerProvider>
      <PanelArea />
    </TrainerProvider>,
  );
  expect(placardOf('battery')).toBe('BAT');
  expect(placardOf('alternator')).toBeUndefined();
});
