import { expect, test } from '@playwright/test';
import { aircraftRegistry } from '../src/aircraft-registry';
import { openAircraft, placardProblems, selectLanguage, showView } from './legibility';

const viewports = [
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];

const runs = aircraftRegistry.flatMap((aircraft) =>
  viewports.flatMap((viewport) =>
    (['en', 'de'] as const).map((language) => ({ aircraft, viewport, language })),
  ),
);

for (const { aircraft, viewport, language } of runs) {
  test(`${aircraft.id} in ${language} prints a legible placard on every widget control at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openAircraft(page, aircraft);
    await selectLanguage(page, language);
    for (const viewId of Object.keys(aircraft.views)) {
      const root = await showView(page, aircraft, viewId, language);
      expect(await placardProblems(root, aircraft, viewId)).toEqual([]);
    }
  });
}
