// @vitest-environment jsdom
import { act, cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { aircraftRegistry } from '../aircraft-registry';
import { renderWithLanguage } from '../i18n/test-utils';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Trainer } from '../trainer';
import { PanelArea } from './index';

let trainer: Trainer;
function Probe() {
  trainer = useTrainer();
  return null;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(cleanup);

const surface = () => screen.getByRole('tabpanel');
const placementOf = (element: Element | null) =>
  element?.closest<HTMLElement>('[data-placement]')?.dataset.placement;

function accessibleName(element: Element): string {
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    return labelledBy
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
      .trim();
  }
  return (element.getAttribute('aria-label') ?? element.textContent ?? '').trim();
}

/** Tabs from the panel surface until focus leaves it, recording each focused element. */
async function tabThroughPanel(): Promise<Element[]> {
  act(() => surface().focus());
  const visited: Element[] = [];
  for (;;) {
    await userEvent.tab();
    const active = document.activeElement;
    if (!active || !surface().contains(active) || visited.includes(active)) return visited;
    visited.push(active);
  }
}

const views = aircraftRegistry.flatMap((aircraft) =>
  Object.keys(aircraft.views).map((viewId) => ({ aircraftId: aircraft.id, viewId })),
);

describe.each(['en', 'de'] as const)('keyboard access in %s', (language) => {
  it.each(views)('reaches every control of $aircraftId/$viewId in placement order', async (at) => {
    renderWithLanguage(
      <TrainerProvider>
        <Probe />
        <PanelArea />
      </TrainerProvider>,
      { language },
    );
    act(() => trainer.selectAircraft(at.aircraftId));
    const aircraft = aircraftRegistry.find((candidate) => candidate.id === at.aircraftId);
    const viewName = aircraft?.views[at.viewId]?.name[language] ?? '';
    await userEvent.click(screen.getByRole('tab', { name: viewName }));

    const visited = await tabThroughPanel();
    const order = visited
      .map(placementOf)
      .filter((id, index, all) => id !== undefined && id !== all[index - 1]);
    const declared = [
      ...Object.keys(aircraft?.views[at.viewId]?.controls ?? {}),
      ...Object.entries(aircraft?.devices ?? {})
        .filter(([, install]) => install.view === at.viewId)
        .map(([installId]) => installId),
    ];
    const controls = [
      ...surface().querySelectorAll<HTMLElement>('[data-placement][data-kind="control"]'),
    ].map((placement) => placement.dataset.placement);

    const screens = [
      ...surface().querySelectorAll<HTMLElement>('[data-placement][data-kind="device"]'),
    ]
      .filter((placement) => placement.querySelector('[data-device-frame]') !== null)
      .map((placement) => placement.dataset.placement);

    expect(controls.length + screens.length).toBeGreaterThan(0);
    expect(order).toEqual(declared.filter((id) => order.includes(id)));
    for (const id of [...controls, ...screens]) expect(order).toContain(id);
    for (const element of visited) {
      expect(accessibleName(element)).not.toBe('');
      if (element.getAttribute('role') === 'slider') {
        expect(element.getAttribute('aria-valuetext') ?? '').not.toBe('');
      }
    }
  });
});
